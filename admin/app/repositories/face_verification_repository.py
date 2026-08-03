from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range


def list_attempts(*, status: str | None = "pending", page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    query = client.table("face_verification_attempts").select(
        "*, profiles(full_name, phone, face_verification_failure_count, face_verification_disabled, face_verification_locked_until)",
        count="exact",
    )
    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).range(start, end).execute()
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def list_disabled_users(*, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    client = get_service_client()
    start, end = page_range(page, page_size)

    result = (
        client.table("profiles")
        .select("id, full_name, phone, face_verification_failure_count, face_verification_disabled", count="exact")
        .eq("face_verification_disabled", True)
        .range(start, end)
        .execute()
    )
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def approve(attempt_id: str, admin_id: str) -> None:
    get_service_client().rpc(
        "admin_approve_face_verification", {"p_attempt_id": attempt_id, "p_admin_id": admin_id}
    ).execute()


def reject(attempt_id: str, admin_id: str, reason: str) -> None:
    get_service_client().rpc(
        "admin_reject_face_verification",
        {"p_attempt_id": attempt_id, "p_admin_id": admin_id, "p_reason": reason},
    ).execute()


def reactivate(user_id: str, admin_id: str) -> None:
    get_service_client().rpc(
        "admin_reactivate_face_verification", {"p_user_id": user_id, "p_admin_id": admin_id}
    ).execute()


def reinitialize_face_identity(user_id: str, admin_id: str) -> None:
    get_service_client().rpc(
        "admin_reinitialize_face_identity", {"p_user_id": user_id, "p_admin_id": admin_id}
    ).execute()


def get_attempt(attempt_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("face_verification_attempts")
        .select("*, profiles(full_name, phone)")
        .eq("id", attempt_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def get_face_identity(user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("face_identities")
        .select("*")
        .eq("user_id", user_id)
        .eq("status", "active")
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def set_face_identity_ai_enrollment(user_id: str, *, provider: str, person_uuid: str) -> None:
    get_service_client().table("face_identities").update(
        {"ai_provider": provider, "ai_person_uuid": person_uuid}
    ).eq("user_id", user_id).execute()


def update_attempt_ai_result(attempt_id: str, ai_result: dict) -> None:
    get_service_client().table("face_verification_attempts").update({"ai_result": ai_result}).eq(
        "id", attempt_id
    ).execute()


def download_face_image(bucket: str, path: str) -> bytes:
    return get_service_client().storage.from_(bucket).download(path)
