"""Generate an iCalendar file from the year CSV files.

Usage: uv run scripts/generate_ics.py [output.ics]
"""

# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "icalendar==7.2.2",
# ]
# ///

import csv
import datetime as dt
import sys
from pathlib import Path

from icalendar import Calendar, Event

CALENDAR_NAME = "Python Conferences"
UID_DOMAIN = "python-organizers.github.io"


def make_event(row: dict[str, str], dtstamp: dt.datetime, seen_uids: set[str]) -> Event:
    event = Event()

    # Stable UIDs so subscribed calendars update events instead of
    # duplicating them
    slug = "".join(c if c.isalnum() else "-" for c in row["Subject"].lower())
    uid = f"{row['Start Date']}-{slug}@{UID_DOMAIN}"
    while uid in seen_uids:
        uid = "x" + uid
    seen_uids.add(uid)
    event.add("uid", uid)

    event.add("dtstamp", dtstamp)
    event.add("dtstart", dt.date.fromisoformat(row["Start Date"]))
    # DTEND is exclusive, so all-day events end the day after the last day
    event.add("dtend", dt.date.fromisoformat(row["End Date"]) + dt.timedelta(days=1))
    event.add("summary", row["Subject"])

    if location := ", ".join(filter(None, [row["Venue"], row["Location"]])):
        event.add("location", location)

    description = "\n".join(
        f"{label}: {value}"
        for label, value in (
            ("Tutorial deadline", row["Tutorial Deadline"]),
            ("Talk deadline", row["Talk Deadline"]),
            ("Website", row["Website URL"]),
            ("Proposals", row["Proposal URL"]),
            ("Sponsorship", row["Sponsorship URL"]),
        )
        if value
    )
    if description:
        event.add("description", description)
    if row["Website URL"]:
        event.add("url", row["Website URL"])

    return event


def main() -> None:
    output = Path(sys.argv[1] if len(sys.argv) > 1 else "conferences.ics")
    repository_folder = Path(__file__).parents[1]
    dtstamp = dt.datetime.now(dt.timezone.utc)

    calendar = Calendar()
    calendar.add("prodid", "-//python-organizers//conferences//EN")
    calendar.add("version", "2.0")
    calendar.add("calscale", "GREGORIAN")
    calendar.add("method", "PUBLISH")
    calendar.add("x-wr-calname", CALENDAR_NAME)
    calendar.add("name", CALENDAR_NAME)

    count = 0
    seen_uids = set()
    for csv_file in sorted(repository_folder.glob("20*.csv")):
        with open(csv_file, newline="") as f:
            for row in csv.DictReader(f):
                calendar.add_component(make_event(row, dtstamp, seen_uids))
                count += 1

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(calendar.to_ical())
    print(f"Wrote {count} events to {output}")


if __name__ == "__main__":
    main()
