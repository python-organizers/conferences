from csv import DictReader, DictWriter, QUOTE_MINIMAL
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parent.parent


def main():
    for path in CSV_PATH.glob("*.csv"):
        with open(path, newline="") as f:
            reader = DictReader(f, dialect="unix")
            rows = list(reader)

        rows.sort(key=lambda row: (row["Start Date"], row["End Date"], row["Subject"]))

        for row in rows:
            for key, value in row.items():
                row[key] = value.strip()

        with open(path, "w", newline="") as f:
            writer = DictWriter(
                f, fieldnames=rows[0].keys(), dialect="unix", quoting=QUOTE_MINIMAL
            )
            writer.writeheader()
            writer.writerows(rows)


if __name__ == "__main__":
    main()
