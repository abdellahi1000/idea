from app.middleware.audit import log_admin_action
from app.repositories import device_transfer_repository as repo


def list_requests(*, status: str | None, page: int):
    return repo.list_requests(status=status, page=page)


def approve(request_id: str, admin_id: str) -> None:
    repo.resolve(request_id, admin_id, approve=True)
    log_admin_action(
        admin_id=admin_id, action="device_transfer_request.approved", entity_table="device_transfer_requests", entity_id=request_id
    )


def reject(request_id: str, admin_id: str, reason: str) -> None:
    repo.resolve(request_id, admin_id, approve=False, reason=reason)
    log_admin_action(
        admin_id=admin_id,
        action="device_transfer_request.rejected",
        entity_table="device_transfer_requests",
        entity_id=request_id,
        metadata={"reason": reason},
    )
