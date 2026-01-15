import csv
import glob
import json
import os
from datetime import datetime, date, timedelta, timezone
from typing import Any, Dict, List, Optional

JSON_PATH = "conferences.json"
ICAL_PATH = "conferences.ics"

EXCLUDE_FOR_DESC = {
    "Subject",
    "Start Date",
    "End Date",
    "Venue",
    "Website URL",
    "Location",
    "Country",
    "year",
}


def infer_year_from_filename(path: str) -> Optional[str]:
    base = os.path.basename(path)
    name, _ext = os.path.splitext(base)
    name = name.strip()
    if len(name) == 4 and name.isdigit():
        return name
    return None


def normalize_row(row: Dict[str, Any]) -> Dict[str, str]:
    cleaned: Dict[str, str] = {}
    for k, v in row.items():
        if v is None:
            cleaned[k] = ""
        else:
            cleaned[k] = str(v).strip()
    return cleaned


def esc_ics(s: str) -> str:
    return (
        str(s or "")
        .replace("\\", "\\\\")
        .replace(",", "\\,")
        .replace(";", "\\;")
        .replace("\n", "\\n")
    )


def parse_date(date_str: str) -> Optional[date]:
    date_str = (date_str or "").strip()
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return None


def build_ical_events(confs: List[Dict[str, str]]) -> List[str]:
    events: List[str] = []

    for row in confs:
        start = parse_date(row.get("Start Date", ""))
        if not start:
            continue

        end_inclusive = parse_date(row.get("End Date", "")) or start

        dtstart = start.strftime("%Y%m%d")
        dtend = (end_inclusive + timedelta(days=1)).strftime("%Y%m%d")

        subject = row.get("Subject", "") or "Untitled Conference"
        dtstamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

        lines = [
            "BEGIN:VEVENT",
            f"UID:{esc_ics(subject)}-{dtstart}",
            f"DTSTAMP:{dtstamp}",
            f"DTSTART;VALUE=DATE:{dtstart}",
            f"DTEND;VALUE=DATE:{dtend}",
            f"SUMMARY:{esc_ics(subject)}",
        ]

        desc_parts: List[str] = []

        if row.get("Venue"):
            desc_parts.append(f"Venue: {row['Venue']}")
        if row.get("Website URL"):
            desc_parts.append(f"Website: {row['Website URL']}")

        for k, v in row.items():
            if k in EXCLUDE_FOR_DESC or not v:
                continue
            desc_parts.append(f"{k}: {v}")

        if desc_parts:
            desc = "\\n".join(esc_ics(p) for p in desc_parts)
            lines.append(f"DESCRIPTION:{desc}")

        if row.get("Location"):
            lines.append(f"LOCATION:{esc_ics(row['Location'])}")

        lines.append("END:VEVENT")
        events.append("\r\n".join(lines))

    return events


def main() -> None:
    conferences: List[Dict[str, str]] = []

    for csvfile in sorted(glob.glob("../*.csv")):
        year = infer_year_from_filename(csvfile)

        with open(csvfile, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if not any(row.values()):
                    continue

                if not (row.get("Subject") or row.get("Start Date")):
                    continue

                cleaned = normalize_row(row)
                if year is not None:
                    cleaned["year"] = year

                conferences.append(cleaned)

    def sort_key(conf: Dict[str, str]):
        return (conf.get("Start Date", ""), conf.get("Subject", ""))

    conferences.sort(key=sort_key)

    with open(JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(conferences, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(conferences)} conferences to {JSON_PATH}")

    events = build_ical_events(conferences)

    ical_lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Python Conferences//EN",
        *events,
        "END:VCALENDAR",
    ]

    with open(ICAL_PATH, "w", encoding="utf-8") as f:
        f.write("\r\n".join(ical_lines))

    print(f"Wrote {len(events)} events to {ICAL_PATH}")


if __name__ == "__main__":
    main()
