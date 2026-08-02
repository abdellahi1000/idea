from app.repositories import transaction_repository as repo
from app.utilities.csv_export import rows_to_csv


def list_transactions(*, search, status, date_from, date_to, transaction_id, sort, descending, page):
    return repo.list_transactions(
        search=search,
        status=status,
        date_from=date_from,
        date_to=date_to,
        transaction_id=transaction_id,
        sort=sort,
        descending=descending,
        page=page,
    )


def export_csv(*, search, status, date_from, date_to, transaction_id) -> str:
    rows = repo.list_all_for_export(
        search=search, status=status, date_from=date_from, date_to=date_to, transaction_id=transaction_id
    )
    columns = [
        ("id", "Transaction Number"),
        ("sender_name", "Sender"),
        ("receiver_name", "Receiver"),
        ("amount", "Amount"),
        ("currency_code", "Currency"),
        ("status", "Status"),
        ("created_at", "Date"),
    ]
    return rows_to_csv(rows, columns)
