from flask import Blueprint, render_template, request
from flask_login import login_required

from app.middleware.rbac import require_role
from app.services import audit_log_service as service

audit_logs_bp = Blueprint("audit_logs", __name__, url_prefix="/audit-logs")


@audit_logs_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_logs():
    admin_id = request.args.get("admin_id") or None
    action = request.args.get("action") or None
    entity_table = request.args.get("entity_table") or None
    date_from = request.args.get("from") or None
    date_to = request.args.get("to") or None
    page = int(request.args.get("page", 1))

    result = service.list_logs(
        admin_id=admin_id, action=action, entity_table=entity_table, date_from=date_from, date_to=date_to, page=page
    )
    administrators = service.list_administrators()
    return render_template(
        "audit_logs/list.html",
        result=result,
        administrators=administrators,
        filters={"admin_id": admin_id, "action": action, "entity_table": entity_table, "from": date_from, "to": date_to},
    )
