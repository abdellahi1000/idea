from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import account_approval_service as service

account_approvals_bp = Blueprint("account_approvals", __name__, url_prefix="/account-approvals")


@account_approvals_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_accounts():
    status = request.args.get("status", "pending")
    page = int(request.args.get("page", 1))
    result = service.list_by_status(status=status, page=page)
    return render_template("account_approvals/list.html", result=result, status=status)


@account_approvals_bp.route("/<user_id>/approve", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def approve(user_id: str):
    service.approve(user_id, current_user.id)
    flash("Account approved.", "success")
    return redirect(url_for("account_approvals.list_accounts", status="pending"))


@account_approvals_bp.route("/<user_id>/reject", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def reject(user_id: str):
    reason = request.form.get("reason", "").strip()
    if not reason:
        flash("A rejection reason is required.", "danger")
        return redirect(url_for("account_approvals.list_accounts", status="pending"))

    service.reject(user_id, current_user.id, reason)
    flash("Account rejected.", "success")
    return redirect(url_for("account_approvals.list_accounts", status="pending"))
