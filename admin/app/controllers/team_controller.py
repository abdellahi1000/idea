from flask import Blueprint, render_template, request
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import team_service as service

team_bp = Blueprint("team", __name__, url_prefix="/team")


@team_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_members():
    result = service.list_team_members(search=None, page=1)
    return render_template("team/list.html", result=result, search="")


@team_bp.route("/list-partial")
@login_required
@require_role("administrator", "super_administrator")
def list_partial():
    search = request.args.get("q") or None
    page = int(request.args.get("page", 1))
    result = service.list_team_members(search=search, page=page)
    return render_template("team/_customer_list.html", result=result, search=search or "")


@team_bp.route("/<user_id>/workspace")
@login_required
@require_role("administrator", "super_administrator")
def workspace(user_id: str):
    detail = service.get_team_member_workspace(user_id)
    return render_template("team/_workspace.html", detail=detail, user_id=user_id)


@team_bp.route("/<user_id>/generate", methods=["POST"])
@login_required
@require_role("administrator", "super_administrator")
def generate(user_id: str):
    generate_error = None
    pipeline_result = None
    try:
        pipeline_result = service.run_verification_pipeline(user_id, current_user.id)
    except Exception as exc:  # noqa: BLE001 - surfaced inline, never a stack trace
        generate_error = str(exc)

    detail = service.get_team_member_workspace(user_id)
    return render_template(
        "team/_workspace.html",
        detail=detail,
        user_id=user_id,
        pipeline_result=pipeline_result,
        generate_error=generate_error,
    )
