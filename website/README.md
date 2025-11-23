
# Conferences Website

This website displays a list of Python conferences and allows users to download calendar files. It generates conferences.ics and conferences.json from the CSV files in the repository root.

## How it works

A GitHub Actions workflow is set up to run on pushes to the main branch (also by hand and on a schedule). This workflow runs the `website/generate_conferences.py` script to produce the ICS and JSON files. Then all the content in `website/` is deployed to GitHub Pages.

## How to run locally
1. Make sure you're in the `website/` directory.
2. And run:
   ```sh
   python generate_conferences.py && python -m http.server
   ```
3. It is fully static, so you can just go to `http://localhost:8000`.
