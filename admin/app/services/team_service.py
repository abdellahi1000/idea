import tempfile
from pathlib import Path

from app.middleware.audit import log_admin_action
from app.repositories import team_repository as repo
from app.services import face_verification_service
from app.services.ai import extract_frame_to_jpg, get_face_verification_provider

FACE_IDENTITY_BUCKET = "face-identity"
IDENTITY_DOCUMENTS_BUCKET = "identity-documents"


def list_team_members(*, search: str | None, page: int):
    return repo.list_team_members(search=search, page=page)


def get_team_member_workspace(user_id: str) -> dict | None:
    """Verification Workspace (Section 2) data for one customer, or None if
    they have no First Face ID (nothing for Team to manage for them yet)."""
    profile = repo.get_profile(user_id)
    face_identity = repo.get_face_identity(user_id)
    if not profile or not face_identity:
        return None

    latest_attempt = repo.get_latest_attempt(user_id)
    identity = repo.get_latest_approved_identity_verification(user_id)

    return {
        "profile": profile,
        "face_identity": face_identity,
        "latest_attempt": latest_attempt,
        "first_face_url": repo.signed_url(FACE_IDENTITY_BUCKET, face_identity.get("storage_path")),
        "last_face_url": repo.signed_url(FACE_IDENTITY_BUCKET, latest_attempt["last_face_path"])
        if latest_attempt
        else None,
        "selfie_url": repo.signed_url(IDENTITY_DOCUMENTS_BUCKET, identity["selfie_path"]) if identity else None,
        "id_card_url": repo.signed_url(IDENTITY_DOCUMENTS_BUCKET, identity["document_front_path"])
        if identity
        else None,
    }


def _step_result(*, matched: bool, confidence: float | None, provider: str, note: str | None = None) -> dict:
    result = {"matched": matched, "confidence": confidence, "provider": provider}
    if note:
        result["note"] = note
    return result


def run_verification_pipeline(user_id: str, admin_id: str) -> dict:
    """Runs the 3-step AI verification chain and auto-approves/rejects the
    user's latest Face Verification attempt based on the outcome:

      1. First Face ID  <-> Last Face ID
      2. Last Face ID    <-> Profile Selfie (latest approved
         identity_verification.selfie_path)
      3. Last Face ID    <-> Identity Card Photo (same record's
         document_front_path)

    The provider contract only supports "compare an image against an
    already-enrolled person" (see app.services.ai.base), not arbitrary
    two-image comparisons. So the person is enrolled once from the First
    Face ID (same lazy-enrollment convention as run_ai_compare) and every
    step verifies an image against that single enrolled identity - step 1
    confirms Last Face ID belongs to that identity, and steps 2/3 confirm
    the selfie/ID photo belong to the same already-confirmed identity.

    Stops at the first failed/missing step, rejects (applying the existing
    progressive lockout), and returns early. If all 3 steps match, approves.
    This is the only place a future real AI model needs to plug in - each
    step is a single provider.verify() call, so swapping
    get_face_verification_provider()'s implementation is enough.
    """
    attempt = repo.get_latest_attempt(user_id)
    if not attempt:
        raise ValueError("This user has no Face Verification attempt to review.")

    face_identity = repo.get_face_identity(user_id)
    if not face_identity:
        raise ValueError("This user has no First Face Identity on file.")

    provider = get_face_verification_provider()
    pipeline: dict = {}

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        last_face_jpg = tmp_path / "last_face.jpg"
        last_face_video = repo.download_from_bucket(FACE_IDENTITY_BUCKET, attempt["last_face_path"])
        extract_frame_to_jpg(last_face_video, last_face_jpg)

        person_uuid = face_identity.get("ai_person_uuid")
        if not person_uuid or face_identity.get("ai_provider") != provider.name:
            first_face_jpg = tmp_path / "first_face.jpg"
            first_face_video = repo.download_from_bucket(FACE_IDENTITY_BUCKET, face_identity["storage_path"])
            extract_frame_to_jpg(first_face_video, first_face_jpg)

            profile = repo.get_profile(user_id) or {}
            person_uuid = provider.enroll(
                external_id=user_id,
                display_name=profile.get("full_name") or user_id,
                image_path=str(first_face_jpg),
            )
            repo.set_face_identity_ai_enrollment(user_id, provider=provider.name, person_uuid=person_uuid)

        # Step 1: First Face ID <-> Last Face ID
        step1 = provider.verify(person_uuid=person_uuid, image_path=str(last_face_jpg))
        pipeline["step1_first_vs_last"] = _step_result(
            matched=step1.matched, confidence=step1.confidence, provider=step1.provider
        )
        if not step1.matched:
            return _finish(pipeline, "step1_first_vs_last", attempt["id"], admin_id)

        # Steps 2 and 3 both come from the same approved identity_verification record.
        identity = repo.get_latest_approved_identity_verification(user_id)

        # Step 2: Last Face ID <-> Profile Selfie
        selfie_path = identity.get("selfie_path") if identity else None
        if not selfie_path:
            pipeline["step2_last_vs_selfie"] = _step_result(
                matched=False, confidence=None, provider=provider.name, note="No verified selfie on file."
            )
            return _finish(pipeline, "step2_last_vs_selfie", attempt["id"], admin_id)

        selfie_jpg = tmp_path / "selfie.jpg"
        selfie_bytes = repo.download_from_bucket(IDENTITY_DOCUMENTS_BUCKET, selfie_path)
        selfie_jpg.write_bytes(selfie_bytes)
        step2 = provider.verify(person_uuid=person_uuid, image_path=str(selfie_jpg))
        pipeline["step2_last_vs_selfie"] = _step_result(
            matched=step2.matched, confidence=step2.confidence, provider=step2.provider
        )
        if not step2.matched:
            return _finish(pipeline, "step2_last_vs_selfie", attempt["id"], admin_id)

        # Step 3: Last Face ID <-> Identity Card Photo
        document_path = identity.get("document_front_path") if identity else None
        if not document_path:
            pipeline["step3_last_vs_id_card"] = _step_result(
                matched=False, confidence=None, provider=provider.name, note="No approved identity card photo on file."
            )
            return _finish(pipeline, "step3_last_vs_id_card", attempt["id"], admin_id)

        id_card_jpg = tmp_path / "id_card.jpg"
        id_card_bytes = repo.download_from_bucket(IDENTITY_DOCUMENTS_BUCKET, document_path)
        id_card_jpg.write_bytes(id_card_bytes)
        step3 = provider.verify(person_uuid=person_uuid, image_path=str(id_card_jpg))
        pipeline["step3_last_vs_id_card"] = _step_result(
            matched=step3.matched, confidence=step3.confidence, provider=step3.provider
        )
        if not step3.matched:
            return _finish(pipeline, "step3_last_vs_id_card", attempt["id"], admin_id)

    return _finish(pipeline, None, attempt["id"], admin_id)


def _finish(pipeline: dict, failed_step: str | None, attempt_id: str, admin_id: str) -> dict:
    repo.update_attempt_ai_result(attempt_id, {"pipeline": pipeline, "failed_step": failed_step})

    if failed_step:
        # face_verification_service.reject() already applies the
        # progressive lockout (1h / 2h / permanent disable at 3 failures)
        # and notifies the user - nothing extra to do here.
        face_verification_service.reject(attempt_id, admin_id, reason=f"AI pipeline failed at {failed_step}")
        outcome = "failed"
    else:
        face_verification_service.approve(attempt_id, admin_id)
        outcome = "verified"

    log_admin_action(
        admin_id=admin_id,
        action="team.ai_verification_generated",
        entity_table="face_verification_attempts",
        entity_id=attempt_id,
        metadata={"outcome": outcome, "failed_step": failed_step, "pipeline": pipeline},
    )

    return {"outcome": outcome, "failed_step": failed_step, "pipeline": pipeline}
