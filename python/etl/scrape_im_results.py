import sys; sys.path.extend([".", "..", "../.."])

import requests
import json, os, glob
import pandas as pd

from utils.paths import data_folder, tasks_folder
from job import Job, JobStatus, await_pooled_jobs


API_KEY = os.getenv("API_KEY")
if API_KEY is None:
  raise EnvironmentError('Please set the `API_KEY` environment variable before running this script.')


def scrape_single(
  subevent_id: str,
  sort: str = "FinishRankOverall",
  age_group: None | str = None,
  skip: int = 0,
  limit: int = 100,
) -> dict | None:
  """Scrapes the Competitor API for the results of a subevent.

  ```text
  https://api.competitor.com/public/result/subevent/1C0CAFFB-36CF-46F6-8F67-C1E7F7F428B8?%24limit=100&%24skip=0&%24sort%5BFinishRankOverall%5D=1&AgeGroup=M25-29
  ```
  """
  url = f"https://api.competitor.com/public/result/subevent/{subevent_id}"
  params = {
    "$limit": limit,
    "$skip": skip,
    f"$sort[{sort}]": 1,
    "AgeGroup": age_group
  }
  response = requests.get(url, params=params, headers={"wtc_priv_key": API_KEY})
  return response.json()


def scrape(
  subevent_id: str,
  sort: str = "FinishRankOverall",
  age_group: None | str = None,
  limit: int = 100,
  verbose: bool = False,
) -> dict | None:
  """Scrapes all the results for a subevent by paginating."""
  skip = 0
  data = []
  while True:
    if verbose: print(f"Scraping {skip} to {skip + limit}")
    results = scrape_single(subevent_id, sort=sort, age_group=age_group, skip=skip, limit=limit)
    # A failed request will return None.
    if results is None:
      return None
    data.extend(results["data"])
    skip += limit
    # Stop once we have all the results.
    if skip >= results["total"]:
      break
  return dict(total=results["total"], data=data)


def pipeline(subevent_id: str):
  """Downloads the results of a subevent and saves them to a file."""
  print(f"Scraping {subevent_id}")
  data = scrape(subevent_id)
  filepath = data_folder(f"im/json/{subevent_id}.json")
  with open(filepath, "w") as file:
    json.dump(data, file, indent=2)


def finished_jobs() -> list[str]:
  """Returns a list of the subevent IDs that have already been scraped."""
  return list(
    map(
      lambda f: f.split("/")[-1].replace(".json", ""),
      glob.glob(data_folder("im/json/*.json"))
    )
  )


def main():
  """Scrapes all the subevents in the `im/subevents.csv` file."""
  from argparse import ArgumentParser
  parser = ArgumentParser()
  parser.add_argument("--t", type=int, default=4)
  args = parser.parse_args()

  df = pd.read_csv(tasks_folder("im/subevents.csv"))

  # Get a set of the subevent IDs that we've already scraped.
  done = finished_jobs()
  todo = set(df.subevent_id.unique().tolist()) - set(done)

  print(f"Found {len(done)} subevents that have already been scraped. If you want to re-scrape them, delete the files.")
  print(f"We have {len(todo)} remaining subevents to process. Will use {args.t} threads.")

  # Jobs are tagged with the subevent ID as a UID so that we can identify them later.
  results = await_pooled_jobs([Job(pipeline, (subevent_id,)) for subevent_id in todo], t=args.t)

  for r in results:
    if r.status != JobStatus.FULFILLED:
      print(f"Job (args={r.args}) failed with exception: {r.reason}.")

  print("DONE")


if __name__ == "__main__":
  main()