# Python Tools

This folder contains Python scripts, mainly for extracting and transforming datasets.

## ETL Scripts

The scripts in `etl` scrape and process the Ironman data.

Most scripts accept a `--t` argument to specify the number of threads.

```bash
# Get all of the Ironman races (current and discontinued):
python scrape_im_races.py

# Get all of the subevent IDs (needed to query results) and save them as CSV:
API_KEY=<IRONMAN_PUBLIC_API_KEY> python scrape_im_subevents.py -t 4

# Get all of the results for each subevent and save them as JSON:
API_KEY=<IRONMAN_PUBLIC_API_KEY> python scrape_im_results.py -t 4

# Convert all of the JSON files to CSV:
python create_im_csv.py
```