from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import device_transfer_service as service

device_transfers_bp = Blueprint("device_transfers", __name__, url_prefix="/device-transfers")


@device_transfers_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_requests():
    status = request.args.get("status", "pending")
    page = int(request.args.get("page", 1))
    result = service.list_requests(status=status or None, page=page)
    return render_template("device_transfers/list.html", result=result, status=status)


@device_transfers_bp.route("/<request_id>/approve", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def approve(request_id: str):
    service.approve(request_id, current_user.id)
    flash("Device transfer approved.", "success")
    return redirect(url_for("device_transfers.list_requests"))


@device_transfers_bp.route("/<request_id>/reject", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def reject(request_id: str):
    reason = request.form.get("reason", "").strip()
    if not reason:
        flash("A rejection reason is required.", "danger")
        return redirect(url_for("device_transfers.list_requests"))

    service.reject(request_id, current_user.id, reason)
    flash("Device transfer rejected.", "success")
    return redirect(url_for("device_transfers.list_requests"))
