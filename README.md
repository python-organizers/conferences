# Python Conferences

Here is a list of Python Conferences around the world. The goal is to make it easier for **speakers, instructors, sponsors** to find your conference.

- If you would like to add a conference or tool, please [submit a pull request](https://github.com/python-organizers/conferences/pulls).
- If you are a conference organizer, we can give you direct access to the repository, but it is your responsibility to update your own event! [Open an issue](https://github.com/python-organizers/conferences/issues/new?template=request-for-access-as-a-conference-organizer.md) to add yourself to the repository.

:warning: This repository does not power www.pycon.org; to add an event to www.pycon.org, see [its official repository](https://github.com/PyCon/pycon.org#adding-your-pycon-to-the-website). See also https://github.com/python-organizers/resources.

## File Format

Each CSV file is [compatible with Google Calendar](https://support.google.com/calendar/answer/37118?hl=en) and has additional optional fields.

| Field             | Description                                | Format                        | Notes
|-------------------|--------------------------------------------|-------------------------------|---------------
| Subject           | Event name                                 | Text                          | required, used by Google Calendar
| Start Date        | First day of event                         | YYYY-MM-DD                    | required, used by Google Calendar
| End Date          | Last day of event                          | YYYY-MM-DD                    | used by Google Calendar
| Location          | Location of the event                      | Text                          | used by Google Calendar
| Country           | Country code                               | [ISO 3166-1 alpha-3][ISO3166] |
| Venue             | Name of event venue                        | Text                          | e.g. "Oregon Convention Center"
| Tutorial Deadline | Last day for tutorial proposal submissions | YYYY-MM-DD                    |
| Talk Deadline     | Last day for talk proposal submissions     | YYYY-MM-DD                    |
| Website URL       | Event website                              | URL                           |
| Proposal URL      | Proposal information                       | URL                           |
| Sponsorship URL   | Sponsorship information                    | URL                           |

## Tests & Linting

There are tests to ensure that the files are written in the correct format

    pip install -r linters/requirements.txt
    python linters/format.py
    python linters/validate.py

## Tools Using this Dataset

- [See upcoming proposal deadlines and conference dates](https://crosscompute.net/a/conference-planner/b/python/o)
- [Add conference dates to your calendar](https://pythondeadlin.es)

[ISO3166]: https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3
