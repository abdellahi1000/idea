from app.authentication.supabase_clients import get_service_client
from app.utilities.pagination import DEFAULT_PAGE_SIZE, Page, page_range

FACE_IDENTITY_BUCKET = "face-identity"
IDENTITY_DOCUMENTS_BUCKET = "identity-documents"

# Customer selector (Section 1) columns only - phone/account number/name.
# Deliberately never selects media/verification data here so this list
# stays fast at hundreds or thousands of rows.
LIST_COLUMNS = "id, full_name, phone, account_number, face_identities!inner(id)"


def list_team_members(*, search: str | None = None, page: int = 1, page_size: int = DEFAULT_PAGE_SIZE) -> Page[dict]:
    """Users who have a First Face ID on file - the population Team manages."""
    client = get_service_client()
    start, end = page_range(page, page_size)

    query = client.table("profiles").select(LIST_COLUMNS, count="exact")
    if search:
        like = f"%{search.replace(',', ' ').strip()}%"
        query = query.or_(f"full_name.ilike.{like},phone.ilike.{like},account_number.ilike.{like}")

    result = query.order("account_number").range(start, end).execute()
    return Page(items=result.data or [], page=page, page_size=page_size, total=result.count or 0)


def get_face_identity(user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("face_identities")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def get_profile(user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("profiles")
        .select(
            "id, full_name, phone, account_number, "
            "face_verification_failure_count, face_verification_locked_until, face_verification_disabled"
        )
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return result.data if result else None


def get_latest_attempt(user_id: str) -> dict | None:
    client = get_service_client()
    result = (
        client.table("face_verification_attempts")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    items = result.data or []
    return items[0] if items else None


def get_latest_approved_identity_verification(user_id: str) -> dict | None:
    """The same approved identity_verification record supplies both the
    Profile Selfie card and the Identity Card (Front) card."""
    client = get_service_client()
    result = (
        client.table("identity_verification")
        .select("selfie_path, document_front_path")
        .eq("user_id", user_id)
        .eq("status", "approved")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    items = result.data or []
    return items[0] if items else None


def set_face_identity_ai_enrollment(user_id: str, *, provider: str, person_uuid: str) -> None:
    get_service_client().table("face_identities").update(
        {"ai_provider": provider, "ai_person_uuid": person_uuid}
    ).eq("user_id", user_id).execute()


def update_attempt_ai_result(attempt_id: str, ai_result: dict) -> None:
    get_service_client().table("face_verification_attempts").update({"ai_result": ai_result}).eq(
        "id", attempt_id
    ).execute()


def download_from_bucket(bucket: str, path: str) -> bytes:
    return get_service_client().storage.from_(bucket).download(path)


def signed_url(bucket: str, path: str | None, *, expires_in: int = 3600) -> str | None:
    if not path:
        return None
    client = get_service_client()
    result = client.storage.from_(bucket).create_signed_url(path, expires_in)
    return result.get("signedURL") or result.get("signedUrl")
