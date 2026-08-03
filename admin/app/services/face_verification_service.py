import tempfile
from pathlib import Path

from app.middleware.audit import log_admin_action
from app.repositories import face_verification_repository as repo
from app.services.ai import VerificationResult, extract_frame_to_jpg, get_face_verification_provider

FACE_IDENTITY_BUCKET = "face-identity"


def list_attempts(*, status: str | None, page: int):
    return repo.list_attempts(status=status, page=page)


def list_disabled_users(*, page: int):
    return repo.list_disabled_users(page=page)


def approve(attempt_id: str, admin_id: str) -> None:
    repo.approve(attempt_id, admin_id)
    log_admin_action(
        admin_id=admin_id,
        action="face_verification_attempt.approved",
        entity_table="face_verification_attempts",
        entity_id=attempt_id,
    )


def reject(attempt_id: str, admin_id: str, reason: str) -> None:
    repo.reject(attempt_id, admin_id, reason)
    log_admin_action(
        admin_id=admin_id,
        action="face_verification_attempt.rejected",
        entity_table="face_verification_attempts",
        entity_id=attempt_id,
        metadata={"reason": reason},
    )


def reactivate(user_id: str, admin_id: str) -> None:
    repo.reactivate(user_id, admin_id)
    log_admin_action(
        admin_id=admin_id,
        action="face_verification.reactivated",
        entity_table="profiles",
        entity_id=user_id,
    )


def reinitialize_face_identity(user_id: str, admin_id: str) -> None:
    repo.reinitialize_face_identity(user_id, admin_id)
    log_admin_action(
        admin_id=admin_id,
        action="face_identity.reinitialized",
        entity_table="face_identities",
        entity_id=user_id,
    )


def run_ai_compare(attempt_id: str, admin_id: str) -> VerificationResult:
    """Runs the configured AI face-verification provider (Luxand today) as
    an assist for the admin's manual decision - it never approves/rejects
    on its own. Enrolls the user's First Face ID with the provider on first
    use, lazily, since enrollment only happens server-side here."""
    attempt = repo.get_attempt(attempt_id)
    if not attempt:
        raise ValueError("Face verification attempt not found.")

    user_id = attempt["user_id"]
    face_identity = repo.get_face_identity(user_id)
    if not face_identity:
        raise ValueError("This user has no First Face Identity on file.")

    provider = get_face_verification_provider()

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)

        last_face_jpg = tmp_path / "last_face.jpg"
        last_face_video = repo.download_face_image(FACE_IDENTITY_BUCKET, attempt["last_face_path"])
        extract_frame_to_jpg(last_face_video, last_face_jpg)

        person_uuid = face_identity.get("ai_person_uuid")
        if not person_uuid or face_identity.get("ai_provider") != provider.name:
            first_face_jpg = tmp_path / "first_face.jpg"
            first_face_video = repo.download_face_image(FACE_IDENTITY_BUCKET, face_identity["storage_path"])
            extract_frame_to_jpg(first_face_video, first_face_jpg)

            display_name = (attempt.get("profiles") or {}).get("full_name") or user_id
            person_uuid = provider.enroll(
                external_id=user_id, display_name=display_name, image_path=str(first_face_jpg)
            )
            repo.set_face_identity_ai_enrollment(user_id, provider=provider.name, person_uuid=person_uuid)

        result = provider.verify(person_uuid=person_uuid, image_path=str(last_face_jpg))
        # tmp_dir (and everything in it) is removed here, on context exit.

    repo.update_attempt_ai_result(
        attempt_id,
        {
            "provider": result.provider,
            "matched": result.matched,
            "confidence": result.confidence,
            "raw_response": result.raw_response,
        },
    )
    log_admin_action(
        admin_id=admin_id,
        action="face_verification_attempt.ai_compared",
        entity_table="face_verification_attempts",
        entity_id=attempt_id,
        metadata={"provider": result.provider, "matched": result.matched, "confidence": result.confidence},
    )
    return result
