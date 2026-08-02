import logging

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import balance_service

balance_bp = Blueprint("balance", __name__, url_prefix="/balance")
logger = logging.getLogger(__name__)


@balance_bp.route("/<wallet_id>")
@login_required
@require_role("super_administrator")
def adjust_form(wallet_id: str):
    wallet = balance_service.get_wallet(wallet_id)
    if not wallet:
        flash("Wallet not found.", "warning")
        return redirect(url_for("users.list_users"))
    return render_template("balance/adjust.html", wallet=wallet)


@balance_bp.route("/<wallet_id>/adjust", methods=["POST"])
@login_required
@require_role("super_administrator")
def adjust(wallet_id: str):
    action = request.form.get("action")
    reason = request.form.get("reason", "").strip()
    try:
        amount = float(request.form.get("amount", "0"))
    except ValueError:
        amount = 0

    if not reason or amount <= 0:
        flash("An amount and a reason are both required.", "danger")
        return redirect(url_for("balance.adjust_form", wallet_id=wallet_id))

    delta = amount if action == "add" else -amount

    try:
        balance_service.adjust_balance(wallet_id, delta, reason, current_user.id)
    except Exception:  # noqa: BLE001 - logged server-side, never shown to the browser
        logger.exception("Balance adjustment failed for wallet %s", wallet_id)
        flash("Adjustment failed. The wallet may not have sufficient balance for this change.", "danger")
        return redirect(url_for("balance.adjust_form", wallet_id=wallet_id))

    flash("Balance adjusted.", "success")
    return redirect(url_for("balance.adjust_form", wallet_id=wallet_id))
