import csv
import logging
import sys
import warnings
from collections import Counter
from pathlib import Path

import httpx
from bs4 import BeautifulSoup, MarkupResemblesLocatorWarning
from ics import Calendar


warnings.filterwarnings('ignore', category=MarkupResemblesLocatorWarning)


def get_uris(element):
    uris = [normalize_uri(_.get('href')) for _ in element.find_all('a')]
    return uris


minimum_year = int(sys.argv[1])


logging.basicConfig()
L = logging.getLogger('net')
L.setLevel(logging.INFO)


event_maps = []


uri = 'https://pycon.org'
text = httpx.get(uri).text
L.info(f'uri = {uri}')
L.info(f'text_length = {len(text)}')
soup = BeautifulSoup(text, 'html.parser')


def normalize_uri(uri):
    character_counts = Counter(uri)
    if character_counts.get('/') == 3:  # noqa: PLR2004
        uri = uri.rstrip('/')
    return uri


conference_elements = soup.select('.conference')
L.info(f'event_count = {len(conference_elements)}')
for conference_element in conference_elements:
    name = conference_element.find('h3').text
    location = conference_element.select_one('.location').text
    uris = get_uris(conference_element)
    event_maps.append({
        'Subject': name,
        'Location': location,
        'Website URL': uris[0],
        'Updates URL': uris[1] if len(uris) > 1 else ''})


iframe_elements = soup.find_all('iframe')
if len(iframe_elements) != 1:
    L.warning('more than one iframe found')
    sys.exit(1)
ics_uris = get_uris(iframe_elements[0])


for uri in ics_uris:
    text = httpx.get(uri, follow_redirects=True).text
    L.info(f'uri = {uri}')
    L.info(f'text_length = {len(text)}')
    c = Calendar(text)
    d = {_.name: _.value for _ in c.extra}
    if d.get('X-WR-CALNAME') == 'Python Events Calendar':
        break


for event in c.events:
    website_uri = ''
    description = event.description
    if description:
        soup = BeautifulSoup(description, 'html.parser')
        a_element = soup.find('a')
        if a_element:
            website_uri = normalize_uri(a_element.get('href', ''))
    start_date = event.begin.date()
    if start_date.year < minimum_year:
        continue
    event_maps.append({
        'Subject': event.name,
        'Start Date': start_date,
        'End Date': event.end.date(),
        'Location': event.location,
        'Website URL': website_uri})


column_names = [
    'Subject',
    'Start Date',
    'End Date',
    'Location',
    'Country',
    'Venue',
    'Tutorial Deadline',
    'Talk Deadline',
    'Website URL',
    'Proposal URL',
    'Sponsorship URL']
with Path('conferences.csv').open('wt') as f:
    writer = csv.DictWriter(
        f,
        fieldnames=column_names,
        extrasaction='ignore')
    writer.writeheader()
    writer.writerows(event_maps)
