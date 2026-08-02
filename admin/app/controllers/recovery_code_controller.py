import logging

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import recovery_code_service as service

recovery_code_bp = Blueprint("recovery_code", __name__, url_prefix="/recovery-code")
logger = logging.getLogger(__name__)


@recovery_code_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_users():
    page = int(request.args.get("page", 1))
    result = service.list_users_with_status(page=page)
    return render_template("recovery_code/list.html", result=result)


@recovery_code_bp.route("/<user_id>/reset", methods=["POST"])
@login_required
@require_role("super_administrator")
def reset(user_id: str):
    service.reset(user_id, current_user.id)
    flash("Recovery Code reset. The user can now create a new one from their app.", "success")
    return redirect(url_for("recovery_code.list_users"))


@recovery_code_bp.route("/<user_id>/grant-view", methods=["POST"])
@login_required
@require_role("super_administrator")
def grant_view(user_id: str):
    try:
        service.grant_one_time_view(user_id, current_user.id)
        flash("One-time view permission granted. The user can now view their Recovery Code once.", "success")
    except Exception:  # noqa: BLE001 - e.g. user has no code yet
        logger.exception("Failed to grant one-time recovery code view for user %s", user_id)
        flash("Could not grant view permission. Does this user have a Recovery Code?", "danger")
    return redirect(url_for("recovery_code.list_users"))
