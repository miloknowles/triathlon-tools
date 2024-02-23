import sys; sys.path.extend([".", "..", "../.."])

from bs4 import BeautifulSoup
import requests
import pandas as pd
import os

from queue import Queue
from threading import Lock
from threading import Thread

from utils.paths import tasks_folder

_lock = Lock() # Lock for writing to the CSV file.


API_KEY = os.getenv("API_KEY")
if API_KEY is None:
  raise EnvironmentError('Please set the `API_KEY` environment variable before running this script.')


def crawl(url) -> list[tuple[str, str]]:
  """Get the subevent IDs from a main event page.
  
  Returns
  -------
  A list of tuples, where the first element is the subevent ID and the second is the year of the event.
  """
  r = requests.get(url)

  # First, we look for all of the "tab-remote" objects, which point to the results
  # for a given year. These will have a relative URL like:
  # /layout_container/show_layout_tab?layout_container_id=100774644&page_node_id=6280763&tab_element_id=303164
  subevent_urls = []
  soup = BeautifulSoup(r.text, "html.parser")
  for a in soup.find_all("a", class_="tab-remote"):
    subevent_urls.append(f'https://www.ironman.com{a["href"]}')

  # Next, we visit each subevent URL and extract the subevent ID from the <iframe> that is loaded.
  info = []
  for url in subevent_urls:
    r = requests.get(url, timeout=10)
    soup = BeautifulSoup(r.text, "html.parser")

    iframe = soup.find("iframe")

    # Sometimes there won't be an <iframe> because of a TriClub results tab.
    if iframe is not None:
      subevent_id = iframe["src"].split("/")[-1]
      r = requests.get(
        f"https://api.competitor.com/public/events/{subevent_id}",
        headers={"wtc_priv_key": API_KEY}
      )
      year = r.json()["EventYear"]

      info.append((iframe["src"].split("/")[-1], year))

  return info


def save(row: dict):
  """Process a row of the spreadsheet."""
  name = row["name"]
  series = row["series"]
  results_url = row["results_url"]

  print("Processing", name, series, results_url)
  subevent_info = crawl(results_url)

  df = dict(subevent_id=[], results_url=[], name=[], series=[], year=[])

  # Make a small dataframe with the info about each year's event.
  for (id, year) in subevent_info:
    df["subevent_id"].append(id)
    df["results_url"].append(results_url) 
    df["name"].append(name)
    df["series"].append(series)
    df["year"].append(int(year))

  _lock.acquire()

  # If the file already exists, we need to merge the new data with the old data.
  if os.path.exists(tasks_folder("im/subevents.csv")):
    existing = pd.read_csv(
      tasks_folder("im/subevents.csv"),
      index_col="subevent_id"
    )
    print(df)
    merged = pd.concat([existing, pd.DataFrame(df).set_index("subevent_id")]).drop_duplicates()
  else:
    merged = pd.DataFrame(df).set_index("subevent_id")
  
  merged.year = merged.year.astype(int)
  merged.to_csv(tasks_folder("im/subevents.csv"), index=True)

  _lock.release()


def worker(q: Queue):
  """Thread worker function."""
  while not q.empty():
    item = q.get()
    save(item)
    q.task_done()


def main():
  """Scrape information about active races from the Ironman spreadsheet.

  Yes... they do keep everything in one big spreadsheet.

  https://docs.google.com/spreadsheets/d/1yLtxUETnuF3UZLmypYkAK6Vj4PE9Fo_BT-WsA4oE_YU/edit#gid=440730663
  """
  from argparse import ArgumentParser
  parser = ArgumentParser()
  parser.add_argument("--t", type=int, default=4, help="The number of threads to use")
  parser.add_argument("--skip-existing", action="store_true", help="Skip races that have already been scraped. Don't use this if you want to get all of the latest data.")
  args = parser.parse_args()

  # Load in all of the races. For each race, we'll find all of the subevents,
  # which correspond to a year that the race was held.
  df = pd.read_csv(tasks_folder("im/races.csv"))
  already_scraped_races = set(pd.read_csv(tasks_folder("im/subevents.csv")).name.unique().tolist())

  # Add all of the events to the queue.
  q = Queue()
  for i in range(len(df)):
    row = df.iloc[i]
    print(row['name'])

    if args.skip_existing and row["name"] in already_scraped_races:
      print(f"Skipping {row['name']} because it has already been scraped and --skip-existing was passed.")
      continue

    q.put(row.to_dict())

  # Start the threads.
  for _ in range(args.t):
    t = Thread(
      target=worker,
      args=(q,),
    )
    t.start()
  
  # Wait for all the threads to finish.
  q.join()

  print("DONE")


if __name__ == "__main__":
  """Gather all of the subevent IDs for IRONMAN events."""
  main()