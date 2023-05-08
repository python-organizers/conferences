from pathlib import Path

import pandas as pd


repository_folder = Path(__file__).parents[1]
g = repository_folder.glob('*.csv')
t = pd.concat(pd.read_csv(_) for _ in g if _.name != 'conferences.csv')
t.sort_values(['Subject', 'Start Date'], inplace=True)
t.to_csv(repository_folder / 'conferences.csv', index=False)
