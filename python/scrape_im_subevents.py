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
  print("Please set the `API_KEY` environment variable before running this script.")


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
    r = requests.get(url)
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


def save(row: dict, **kwargs):
  """Process a row of the spreadsheet."""
  name = row[kwargs["name_ix"]]
  series = row[kwargs["series_ix"]]
  results_url = f"{row[kwargs["url_ix"]]}-results"

  subevent_info = crawl(results_url)

  df = dict(subevent_id=[], results_url=[], name=[], series=[], year=[])

  for (id, year) in subevent_info:
    print(id, year)
    df["subevent_id"].append(id)
    df["results_url"].append(results_url) 
    df["name"].append(name)
    df["series"].append(series)
    df["year"].append(int(year))

  _lock.acquire()
  if os.path.exists(tasks_folder("im/subevents.csv")):
    existing = pd.read_csv(tasks_folder("im/subevents.csv"), index_col="subevent_id")
    merged = pd.concat([existing, pd.DataFrame(df).set_index("subevent_id")]).drop_duplicates()
  else:
    merged = pd.DataFrame(df).set_index("subevent_id")
  merged.to_csv(tasks_folder("im/subevents.csv"), index=True)
  _lock.release()


def worker(q: Queue, **kwargs):
  """Thread worker function."""
  while not q.empty():
    item = q.get()
    save(item, **kwargs)
    q.task_done()


def main():
  """Scrape information about active races from the Ironman spreadsheet.

  Yes... they do keep everything in one big spreadsheet.

  https://docs.google.com/spreadsheets/d/1yLtxUETnuF3UZLmypYkAK6Vj4PE9Fo_BT-WsA4oE_YU/edit#gid=440730663
  """
  from argparse import ArgumentParser
  parser = ArgumentParser()
  parser.add_argument("--t", type=int, default=4)
  args = parser.parse_args()

  base_url = "https://sheets.googleapis.com/v4/spreadsheets/1yLtxUETnuF3UZLmypYkAK6Vj4PE9Fo_BT-WsA4oE_YU/values/Race-Catalog?key=AIzaSyC9s2sNhwUZOUXJfnyt-cD4k4nUyY-3HBs"

  print("Fetching data from Google Sheets...")
  print(base_url)

  data = requests.get(base_url).json()["values"]
  header = data[0]
  data = data[1:]

  print("HEADER:")
  print(header)

  name_ix: int = header.index("Title \nIRONMAN/IRONMAN 70.3 will be appended")
  series_ix: int = header.index('Brand/Series/Distance')
  url_ix: int = header.index("Race Event Page Link")

  # Add all of the events to the queue.
  q = Queue()
  for i in range(len(data)):
    q.put(data[i])

  # Start the threads.
  for _ in range(args.t):
    t = Thread(
      target=worker,
      args=(q,),
      kwargs=dict(name_ix=name_ix, series_ix=series_ix, url_ix=url_ix)
    )
    t.start()
  
  # Wait for all the threads to finish.
  q.join()

  print("DONE")


if __name__ == "__main__":
  """Gather all of the subevent IDs for IRONMAN events."""
  main()