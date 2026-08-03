from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import locked_accounts_service, user_service

users_bp = Blueprint("users", __name__, url_prefix="/users")


@users_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_users():
    search = request.args.get("q") or None
    page = int(request.args.get("page", 1))
    result = user_service.list_users(search=search, page=page)
    return render_template("users/list.html", result=result, search=search or "")


@users_bp.route("/<user_id>")
@login_required
@require_role("administrator", "super_administrator")
def detail(user_id: str):
    detail_data = user_service.get_user_detail(user_id)
    if not detail_data:
        flash("User not found.", "warning")
        return redirect(url_for("users.list_users"))

    page = int(request.args.get("page", 1))
    wallet = (detail_data["profile"].get("wallets") or [None])[0]
    transactions = user_service.get_user_transactions(user_id, wallet["id"] if wallet else None, page)

    return render_template("users/detail.html", detail=detail_data, wallet=wallet, transactions=transactions)


@users_bp.route("/<user_id>/suspend", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def suspend(user_id: str):
    user_service.suspend_account(user_id, current_user.id)
    flash("Account suspended.", "success")
    return redirect(url_for("users.detail", user_id=user_id))


@users_bp.route("/<user_id>/activate", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def activate(user_id: str):
    user_service.activate_account(user_id, current_user.id)
    flash("Account activated.", "success")
    return redirect(url_for("users.detail", user_id=user_id))


@users_bp.route("/<user_id>/lock", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def lock(user_id: str):
    reason = request.form.get("reason", "manual")
    locked_accounts_service.lock_account(user_id, current_user.id, reason)
    flash("Account locked.", "success")
    return redirect(url_for("users.detail", user_id=user_id))


@users_bp.route("/<user_id>/reset-login-pin", methods=["POST"])
@login_required
@require_role("super_administrator")
def reset_login_pin(user_id: str):
    user_service.reset_login_pin(user_id, current_user.id)
    flash("Login PIN reset. The user will be asked to set a new one after their next Email & Password sign-in.", "success")
    return redirect(url_for("users.detail", user_id=user_id))


@users_bp.route("/<user_id>/notes", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def save_notes(user_id: str):
    notes = request.form.get("notes", "")
    user_service.save_admin_notes(user_id, current_user.id, notes)
    flash("Notes saved.", "success")
    return redirect(url_for("users.detail", user_id=user_id))
