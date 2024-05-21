from csv import DictReader, DictWriter, QUOTE_MINIMAL
from pathlib import Path


FOLDER = Path(__file__).resolve().parent.parent


def main():
    for path in FOLDER.glob('*.csv'):
        with path.open(mode='rt') as f:
            rows = list(DictReader(f, dialect='unix'))
        rows.sort(key=lambda row: (
            row['Start Date'], row['End Date'], row['Subject']))
        new_rows = []
        for row in rows:
            for key, value in row.items():
                row[key] = value.strip()
            if not row['Subject']:
                continue
            new_rows.append(row)
        with path.open(mode='wt') as f:
            writer = DictWriter(
                f, fieldnames=new_rows[0].keys(), dialect='unix',
                quoting=QUOTE_MINIMAL)
            writer.writeheader()
            writer.writerows(new_rows)


if __name__ == '__main__':
    main()
