from datetime import timedelta

from flask import Flask, render_template, session
from flask_login import current_user
from flask_wtf import CSRFProtect
from flask_wtf.csrf import generate_csrf
from markupsafe import Markup

from app.authentication.login_manager import login_manager
from app.configuration.config import Config

csrf = CSRFProtect()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    csrf.init_app(app)
    login_manager.init_app(app)

    _register_blueprints(app)
    _register_error_handlers(app)
    _register_hooks(app)
    _register_template_globals(app)
    _register_cli(app)

    return app


def _register_cli(app: Flask) -> None:
    from app.cli.create_admin import register as register_create_admin

    register_create_admin(app)


def _register_template_globals(app: Flask) -> None:
    @app.context_processor
    def inject_csrf_field():
        def csrf_field() -> Markup:
            return Markup(f'<input type="hidden" name="csrf_token" value="{generate_csrf()}">')

        return {"csrf_field": csrf_field, "csrf_token": generate_csrf}


def _register_blueprints(app: Flask) -> None:
    from app.controllers.access_requests_controller import access_requests_bp
    from app.controllers.account_approvals_controller import account_approvals_bp
    from app.controllers.audit_logs_controller import audit_logs_bp
    from app.controllers.auth_controller import auth_bp
    from app.controllers.balance_controller import balance_bp
    from app.controllers.dashboard_controller import dashboard_bp
    from app.controllers.device_transfers_controller import device_transfers_bp
    from app.controllers.face_verification_controller import face_verification_bp
    from app.controllers.identity_verification_controller import identity_verification_bp
    from app.controllers.locked_accounts_controller import locked_accounts_bp
    from app.controllers.recovery_code_controller import recovery_code_bp
    from app.controllers.settings_controller import settings_bp
    from app.controllers.team_controller import team_bp
    from app.controllers.transactions_controller import transactions_bp
    from app.controllers.users_controller import users_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(access_requests_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(account_approvals_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(identity_verification_bp)
    app.register_blueprint(recovery_code_bp)
    app.register_blueprint(device_transfers_bp)
    app.register_blueprint(face_verification_bp)
    app.register_blueprint(team_bp)
    app.register_blueprint(locked_accounts_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(balance_bp)
    app.register_blueprint(audit_logs_bp)
    app.register_blueprint(settings_bp)


def _register_error_handlers(app: Flask) -> None:
    # Never leak stack traces or internal error details to the browser.
    @app.errorhandler(401)
    def unauthorized(_error):
        return render_template("errors/401.html"), 401

    @app.errorhandler(403)
    def forbidden(_error):
        return render_template("errors/403.html"), 403

    @app.errorhandler(404)
    def not_found(_error):
        return render_template("errors/404.html"), 404

    @app.errorhandler(500)
    def server_error(_error):
        return render_template("errors/500.html"), 500


def _register_hooks(app: Flask) -> None:
    @app.before_request
    def sync_session_lifetime():
        if not current_user.is_authenticated:
            return
        from app.services.settings_service import get_session_timeout_seconds

        session.permanent = True
        app.permanent_session_lifetime = timedelta(seconds=get_session_timeout_seconds())
