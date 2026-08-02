from flask import Blueprint, render_template
from flask_login import login_required

from app.services import dashboard_service

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/")
@login_required
def index():
    data = dashboard_service.get_dashboard_data()
    return render_template("dashboard/index.html", **data)
