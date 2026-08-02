import logging

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import access_request_service as service

access_requests_bp = Blueprint("access_requests", __name__)
logger = logging.getLogger(__name__)


@access_requests_bp.route("/request-access", methods=["GET", "POST"])
def request_access():
    if request.method == "POST":
        try:
            service.sign_up(
                request.form.get("full_name", ""),
                request.form.get("email", ""),
                request.form.get("password", ""),
                request.form.get("confirm_password", ""),
            )
        except service.AccessRequestError as error:
            flash(str(error), "danger")
            return render_template("auth/request_access.html"), 400
        except Exception:  # noqa: BLE001 - logged server-side, never shown to the browser
            logger.exception("Sign up failed")
            flash("Something went wrong creating your account. Please try again.", "danger")
            return render_template("auth/request_access.html"), 500

        flash("Account created successfully. Please sign in.", "success")
        return redirect(url_for("auth.login"))

    return render_template("auth/request_access.html")


@access_requests_bp.route("/access-requests")
@login_required
@require_role("super_administrator")
def list_requests():
    page = int(request.args.get("page", 1))
    result = service.list_pending(page=page)
    return render_template("access_requests/list.html", result=result)


@access_requests_bp.route("/access-requests/<request_id>/approve", methods=["POST"])
@login_required
@require_role("super_administrator")
def approve(request_id: str):
    role = request.form.get("role", "administrator")
    try:
        service.approve_request(request_id, role, current_user.id)
        flash("Request approved. An invitation email has been sent.", "success")
    except service.AccessRequestError as error:
        flash(str(error), "danger")
    except Exception:  # noqa: BLE001 - logged server-side, never shown to the browser
        logger.exception("Failed to approve access request %s", request_id)
        flash("Approval failed. Please try again.", "danger")
    return redirect(url_for("access_requests.list_requests"))


@access_requests_bp.route("/access-requests/<request_id>/reject", methods=["POST"])
@login_required
@require_role("super_administrator")
def reject(request_id: str):
    service.reject_request(request_id, current_user.id)
    flash("Request rejected.", "success")
    return redirect(url_for("access_requests.list_requests"))
