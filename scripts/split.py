from collections import defaultdict
from pathlib import Path

import pandas as pd


def strip_safely(x):
    try:
        x = x.rstrip('/')
    except AttributeError:
        pass
    return x


repository_folder = Path(__file__).parents[1]
t = pd.read_csv(repository_folder / 'conferences.csv')
t.dropna(subset=['Subject'], inplace=True)
events_by_year = defaultdict(list)
for i, r in t.iterrows():
    year = r['Start Date'].split('-')[0]
    events_by_year[year].append(r)
column_names = t.columns
for year, rows in events_by_year.items():
    t = pd.DataFrame(rows, columns=column_names)
    t = t.applymap(strip_safely)
    t.sort_values(['Start Date', 'End Date', 'Subject'], inplace=True)
    t.to_csv((repository_folder / year).with_suffix('.csv'), index=False)
