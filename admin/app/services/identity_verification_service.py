from app.middleware.audit import log_admin_action
from app.repositories import identity_verification_repository as repo


def list_requests(*, status: str | None, page: int):
    return repo.list_requests(status=status, page=page)


def get_request_with_signed_urls(request_id: str) -> dict | None:
    request = repo.get_request(request_id)
    if not request:
        return None
    request["document_front_url"] = repo.signed_url(request.get("document_front_path"))
    request["document_back_url"] = repo.signed_url(request.get("document_back_path"))
    request["selfie_url"] = repo.signed_url(request.get("selfie_path"))
    return request


def approve(request_id: str, admin_id: str) -> None:
    repo.approve(request_id, admin_id)
    log_admin_action(
        admin_id=admin_id, action="identity_verification.approved", entity_table="identity_verification", entity_id=request_id
    )


def reject(request_id: str, admin_id: str, reason: str) -> None:
    repo.reject(request_id, admin_id, reason)
    log_admin_action(
        admin_id=admin_id,
        action="identity_verification.rejected",
        entity_table="identity_verification",
        entity_id=request_id,
        metadata={"reason": reason},
    )
