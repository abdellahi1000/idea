from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import identity_verification_service as service

identity_verification_bp = Blueprint("identity_verification", __name__, url_prefix="/identity-verification")


@identity_verification_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_requests():
    status = request.args.get("status", "pending")
    page = int(request.args.get("page", 1))
    result = service.list_requests(status=status or None, page=page)
    return render_template("identity_verification/list.html", result=result, status=status)


@identity_verification_bp.route("/<request_id>")
@login_required
@require_role("administrator", "super_administrator")
def detail(request_id: str):
    record = service.get_request_with_signed_urls(request_id)
    if not record:
        flash("Verification request not found.", "warning")
        return redirect(url_for("identity_verification.list_requests"))
    return render_template("identity_verification/detail.html", record=record)


@identity_verification_bp.route("/<request_id>/approve", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def approve(request_id: str):
    service.approve(request_id, current_user.id)
    flash("Identity verification approved.", "success")
    return redirect(url_for("identity_verification.list_requests"))


@identity_verification_bp.route("/<request_id>/reject", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def reject(request_id: str):
    reason = request.form.get("reason", "").strip()
    if not reason:
        flash("A rejection reason is required.", "danger")
        return redirect(url_for("identity_verification.detail", request_id=request_id))

    service.reject(request_id, current_user.id, reason)
    flash("Identity verification rejected.", "success")
    return redirect(url_for("identity_verification.list_requests"))
