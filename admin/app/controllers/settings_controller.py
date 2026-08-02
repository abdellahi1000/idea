from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask_login import current_user, login_required

from app.middleware.rbac import require_role
from app.services import settings_service

settings_bp = Blueprint("settings", __name__, url_prefix="/settings")


@settings_bp.route("/")
@login_required
@require_role("super_administrator")
def index():
    fields = settings_service.get_settings_for_display()
    return render_template("settings/index.html", fields=fields)


@settings_bp.route("/update", methods=["POST"])
@login_required
@require_role("super_administrator")
def update():
    key = request.form.get("key")
    field_type = request.form.get("type")

    if field_type == "boolean":
        value = request.form.get("value") == "on"
    elif field_type == "number":
        try:
            value = float(request.form.get("value", "0"))
        except ValueError:
            flash("Invalid number.", "danger")
            return redirect(url_for("settings.index"))
    else:
        value = request.form.get("value", "")

    settings_service.update_setting(key, value, current_user.id)
    flash("Setting updated.", "success")
    return redirect(url_for("settings.index"))
