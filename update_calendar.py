import csv
import datetime
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar",
]

# This calendar ID is public.
CALENDAR_ID = "0ji9k94abd2sehteqqqt4jo47c@group.calendar.google.com"

CURRENT_YEAR = datetime.datetime.now().year


def main():
    creds = service_account.Credentials.from_service_account_file(
        "credentials.json", scopes=SCOPES
    )
    service = build("calendar", "v3", credentials=creds)

    current_events = (
        service.events().list(calendarId=CALENDAR_ID, pageToken=None).execute()
    )

    with Path(f"{CURRENT_YEAR}.csv").open("r") as csv_file:
        csv_reader = csv.DictReader(csv_file, delimiter=",")
        csv_events = [row for row in csv_reader]

    for event in csv_events:
        if event["Subject"] in {
            curr_event["summary"] for curr_event in current_events["items"]
        }:
            continue

        py_event_body = {
            "summary": event["Subject"],
            "location": event["Location"],
            "start": {"date": event["Start Date"]},
            "end": {"date": event["End Date"]},
            "description": event.get("Website URL", ""),
        }
        python_event = (
            service.events()
            .insert(calendarId=CALENDAR_ID, body=py_event_body, sendUpdates="all")
            .execute()
        )
        print("Event created: %s" % (python_event.get("htmlLink")))

        deadline = event["Talk Deadline"]
        if deadline:
            talk_event_body = {
                "summary": event["Subject"],
                "location": event["Location"],
                "start": {"date": deadline},
                "end": {"date": deadline},
                "description": event.get("Website URL", ""),
            }
            talk_proposal_event = (
                service.events()
                .insert(calendarId=CALENDAR_ID, body=talk_event_body, sendUpdates="all")
                .execute()
            )
            print("Event created: %s" % (talk_proposal_event.get("htmlLink")))


if __name__ == "__main__":
    main()
