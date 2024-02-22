import requests
import json
import os
import glob
from queue import Queue
from threading import Thread

import pandas as pd

from utils.paths import data_folder, tasks_folder


API_KEY = os.getenv("API_KEY")
if API_KEY is None:
  print("Please set the `API_KEY` environment variable before running this script.")


def scrape_single(
  subevent_id: str,
  sort: str = "FinishRankOverall",
  age_group: None | str = None,
  skip: int = 0,
  limit: int = 100,
) -> dict | None:
  """Scrapes the Competitor API for the results of a subevent.

  Example URL:
  ```text
  https://api.competitor.com/public/result/subevent/1C0CAFFB-36CF-46F6-8F67-C1E7F7F428B8?%24limit=100&%24skip=0&%24sort%5BFinishRankOverall%5D=1&AgeGroup=M25-29
  ```
  
  Parameters
  ----------
  subevent_id : str
    The ID of the subevent to scrape.
  limit : int, optional
    The number of results to return, by default 100
  skip : int, optional
    The cursor into the results, by default 0. Use this to paginate the results.
  sort : str, optional
    The field to sort the results by, by default "FinishRankOverall". Not sure
    what other fields are available.
  age_group : str, optional
    The age group to filter the results by, for example "M25-29"
  
  Returns
  -------
  The results of the scrape, or None if the request failed.
  """
  url = f"https://api.competitor.com/public/result/subevent/{subevent_id}"
  params = {
    "$limit": limit,
    "$skip": skip,
    f"$sort[{sort}]": 1,
    "AgeGroup": age_group
  }
  response = requests.get(url, params=params, headers={"wtc_priv_key": API_KEY})

  if response.status_code == 200:
    return response.json()
  else:
    print(f"Request failed! URL {response.url} returned {response.status_code}.")
    return None


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


def save(subevent_id: str):
  """Downloads the results of a subevent and saves them to a file."""
  data = scrape(subevent_id)
  filepath = data_folder(f"im/json/{subevent_id}.json")
  with open(filepath, "w") as file:
    json.dump(data, file, indent=2)


def worker(queue: Queue):
  """A worker function that takes subevent IDs from a queue and scrapes them."""
  while not queue.empty():
    subevent_id = queue.get()
    print(f"Scraping {subevent_id}")
    save(subevent_id)
    print(f"Finished {subevent_id}")
    queue.task_done()


def main():
  """Scrapes all the subevents in the `im/subevents.csv` file."""
  from argparse import ArgumentParser
  parser = ArgumentParser()
  parser.add_argument("--t", type=int, default=4)
  args = parser.parse_args()

  task_queue = Queue()

  df = pd.read_csv(tasks_folder("im/subevents.csv"))

  # Get a set of the subevent IDs that we've already scraped.
  scraped = set(map(lambda f: f.split("/")[-1].replace(".json", ""), glob.glob(data_folder("im/*.json"))))
  print(f"Found {len(scraped)} subevents that have already been scraped. If you want to re-scrape them, delete the files.")

  for i in range(len(df)):
    subevent_id: str = df.iloc[i]["subevent_id"]
    if subevent_id not in scraped:
      task_queue.put(subevent_id)

  print(f"Added {task_queue.qsize()} outstanding subevents to the queue. Will process with {args.t} threads.")

  for _ in range(args.t):
    t = Thread(target=worker, args=(task_queue,))
    t.start()

  # Wait for all the tasks to be processed.
  task_queue.join()
  print("DONE")


if __name__ == "__main__":
  main()