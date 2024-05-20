from csv import DictReader, DictWriter, QUOTE_MINIMAL
from pathlib import Path


FOLDER = Path(__file__).resolve().parent.parent


def main():
    for path in FOLDER.glob('*.csv'):
        with path.open(mode='rt') as f:
            reader = DictReader(f, dialect='unix')
            rows = list(reader)

        rows.sort(key=lambda row: (
            row['Start Date'], row['End Date'], row['Subject']))

        for row in rows:
            for key, value in row.items():
                row[key] = value.strip()

        with path.open(mode='wt') as f:
            writer = DictWriter(
                f, fieldnames=rows[0].keys(), dialect='unix',
                quoting=QUOTE_MINIMAL)
            writer.writeheader()
            writer.writerows(rows)


if __name__ == '__main__':
    main()
