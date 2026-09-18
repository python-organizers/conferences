from collections import defaultdict
from contextlib import suppress
from pathlib import Path

import pandas as pd


def strip_safely(x):
    with suppress(AttributeError):
        x = x.rstrip('/')
    return x


repository_folder = Path(__file__).parents[1]
drafts_folder = repository_folder / 'drafts'
t = pd.read_csv(drafts_folder / 'conferences_clean.csv')
t = t.dropna(subset=['Subject'])
events_by_year = defaultdict(list)
for _, r in t.iterrows():
    try:
        year = r['Start Date'].split('-')[0]
    except AttributeError:
        continue
    events_by_year[year].append(r)
column_names = t.columns
for year, rows in events_by_year.items():
    t = pd.DataFrame(rows, columns=column_names)
    t = t.map(strip_safely)
    t = t.sort_values(['Start Date', 'End Date', 'Subject'])
    t.to_csv((repository_folder / year).with_suffix('.csv'), index=False)
