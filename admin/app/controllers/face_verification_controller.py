from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import face_verification_service as service

face_verification_bp = Blueprint("face_verification", __name__, url_prefix="/face-verification")


@face_verification_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_attempts():
    status = request.args.get("status", "pending")
    page = int(request.args.get("page", 1))
    result = service.list_attempts(status=status or None, page=page)
    return render_template("face_verification/list.html", result=result, status=status)


@face_verification_bp.route("/<attempt_id>/approve", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def approve(attempt_id: str):
    service.approve(attempt_id, current_user.id)
    flash("Face verification approved.", "success")
    return redirect(url_for("face_verification.list_attempts"))


@face_verification_bp.route("/<attempt_id>/ai-compare", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def ai_compare(attempt_id: str):
    try:
        result = service.run_ai_compare(attempt_id, current_user.id)
    except Exception as exc:  # noqa: BLE001 - surfaced to the admin, never a stack trace
        flash(f"AI comparison failed: {exc}", "danger")
        return redirect(url_for("face_verification.list_attempts"))

    confidence = f"{result.confidence:.0%}" if result.confidence is not None else "unknown"
    flash(
        f"AI comparison result: {'likely match' if result.matched else 'likely mismatch'} "
        f"({confidence} confidence). This is an assist only - please still review before deciding.",
        "info",
    )
    return redirect(url_for("face_verification.list_attempts"))


@face_verification_bp.route("/<attempt_id>/reject", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def reject(attempt_id: str):
    reason = request.form.get("reason", "").strip()
    if not reason:
        flash("A rejection reason is required.", "danger")
        return redirect(url_for("face_verification.list_attempts"))

    service.reject(attempt_id, current_user.id, reason)
    flash("Face verification rejected.", "success")
    return redirect(url_for("face_verification.list_attempts"))


@face_verification_bp.route("/disabled")
@login_required
@require_role("administrator", "super_administrator")
def list_disabled():
    page = int(request.args.get("page", 1))
    result = service.list_disabled_users(page=page)
    return render_template("face_verification/disabled.html", result=result)


@face_verification_bp.route("/disabled/<user_id>/reactivate", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def reactivate(user_id: str):
    service.reactivate(user_id, current_user.id)
    flash("Face Verification reactivated for this user.", "success")
    return redirect(url_for("face_verification.list_disabled"))


@face_verification_bp.route("/disabled/<user_id>/reinitialize", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def reinitialize(user_id: str):
    service.reinitialize_face_identity(user_id, current_user.id)
    flash("Face Identity reinitialized. The user can record a new one.", "success")
    return redirect(url_for("face_verification.list_disabled"))
