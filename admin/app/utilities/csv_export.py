import csv
import io


def rows_to_csv(rows: list[dict], columns: list[tuple[str, str]]) -> str:
    """columns is a list of (row_key, header_label) pairs, in output order."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow([label for _key, label in columns])
    for row in rows:
        writer.writerow([row.get(key, "") for key, _label in columns])
    return buffer.getvalue()
