from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import locked_accounts_service as service

locked_accounts_bp = Blueprint("locked_accounts", __name__, url_prefix="/locked-accounts")


@locked_accounts_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_locked():
    page = int(request.args.get("page", 1))
    result = service.list_locked_accounts(page=page)
    return render_template("locked_accounts/list.html", result=result)


@locked_accounts_bp.route("/<user_id>/unlock", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def unlock(user_id: str):
    service.unlock_account(user_id, current_user.id)
    flash("Account unlocked.", "success")
    return redirect(url_for("locked_accounts.list_locked"))


@locked_accounts_bp.route("/<user_id>/suspend", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def suspend(user_id: str):
    service.suspend_account(user_id, current_user.id)
    flash("Account suspended.", "success")
    return redirect(url_for("locked_accounts.list_locked"))
