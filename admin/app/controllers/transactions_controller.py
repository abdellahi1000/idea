from flask import Blueprint, Response, render_template, request
from flask_login import login_required

from app.middleware.rbac import require_role
from app.services import transaction_service as service

transactions_bp = Blueprint("transactions", __name__, url_prefix="/transactions")


def _url_filters() -> dict:
    """Query-string-facing filter values, using the same param names the
    template's links/forms read and write (q/status/from/to/transaction_id),
    so pagination/sort/export links round-trip correctly."""
    return {
        "q": request.args.get("q") or "",
        "status": request.args.get("status") or "",
        "from": request.args.get("from") or "",
        "to": request.args.get("to") or "",
        "transaction_id": request.args.get("transaction_id") or "",
    }


def _service_filters(url_filters: dict) -> dict:
    return {
        "search": url_filters["q"] or None,
        "status": url_filters["status"] or None,
        "date_from": url_filters["from"] or None,
        "date_to": url_filters["to"] or None,
        "transaction_id": url_filters["transaction_id"] or None,
    }


@transactions_bp.route("/")
@login_required
@require_role("administrator", "super_administrator")
def list_transactions():
    url_filters = _url_filters()
    sort = request.args.get("sort", "created_at")
    descending = request.args.get("order", "desc") != "asc"
    page = int(request.args.get("page", 1))

    result = service.list_transactions(sort=sort, descending=descending, page=page, **_service_filters(url_filters))
    return render_template(
        "transactions/list.html", result=result, filters=url_filters, sort=sort, order="asc" if not descending else "desc"
    )


@transactions_bp.route("/export.csv")
@login_required
@require_role("administrator", "super_administrator")
def export_csv():
    url_filters = _url_filters()
    csv_content = service.export_csv(**_service_filters(url_filters))
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"},
    )
