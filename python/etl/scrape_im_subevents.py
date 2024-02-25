import sys; sys.path.extend([".", "..", "../.."])

from bs4 import BeautifulSoup
import requests
import pandas as pd
import os

from threading import Lock

from utils.paths import tasks_folder
from job import Job, JobStatus, await_pooled_jobs

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

  if r.status_code != 200:
    raise ValueError(f"{url} responded with status code {r.status_code}.")

  # First, we look for all of the "tab-remote" objects, which point to the results
  # for a given year. These will have a relative URL like:
  # /layout_container/show_layout_tab?layout_container_id=100774644&page_node_id=6280763&tab_element_id=303164
  subevent_urls = []
  soup = BeautifulSoup(r.text, "html.parser")
  for a in soup.find_all("a", class_="tab-remote"):
    subevent_urls.append(f'https://www.ironman.com{a["href"]}')

  if len(subevent_urls) == 0:
    raise ValueError(f"No subevent URLs found on {url}. Check this page manually to see what's going on.")

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

  if len(info) == 0:
    raise ValueError(f"No subevent IDs could be parsed from {url}. Check this page manually to see what's going on.")

  return info


def pipeline(row: dict):
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
  merged = pd.DataFrame(df)

  if os.path.exists(tasks_folder("im/subevents.csv")):
    existing = pd.read_csv(tasks_folder("im/subevents.csv"))
    before = len(existing)
    merged = pd.concat([existing, merged]).drop_duplicates()
    after = len(merged)
    print(f"Merged {before} existing subevents with {len(df)} new subevents. Now we have {after} subevents.")
  
  # Ensure that the year is an integer.
  merged.year = merged.year.astype(int)
  merged.to_csv(tasks_folder("im/subevents.csv"), index=False)

  _lock.release()


def main():
  """For each Ironman race, find the subevent ID for each year that the race is held."""
  from argparse import ArgumentParser
  parser = ArgumentParser()
  parser.add_argument("--t", type=int, default=4, help="The number of threads to use")
  parser.add_argument("--skip-existing", action="store_true", help="Skip races that have already been scraped. Don't use this if you want to get all of the latest data.")
  args = parser.parse_args()

  # Load in all of the races. For each race, we'll find all of the subevents,
  # which correspond to a year that the race was held.
  df = pd.read_csv(tasks_folder("im/races.csv"))
  done = set(pd.read_csv(tasks_folder("im/subevents.csv")).name.unique().tolist())

  print(f"Found {len(done)} races that we've already scraped subevents for. If you want to skip these, use the --skip-existing flag.")

  if args.skip_existing:
    print(f"Note: The --skip-existing flag is set, so we won't process any races that have already been scraped.")

  # Add all of the events to the queue.
  todo = df[~df["name"].isin(done)] if args.skip_existing else df

  print(f"Will scrape subevent IDs for {len(todo)} remaining races.")

  jobs = [Job(pipeline, args=(row.to_dict(),)) for _, row in todo.iterrows()]
  # jobs = [
  #   Job(pipeline, args=(dict(
  #     name="70.3 World Championship",
  #     series="IRONMAN-70.3",
  #     results_url="https://www.ironman.com/im703-world-championship-2024-results"),
  #   )),
  #   Job(pipeline, args=(dict(
  #     name="IRONMAN World Championship",
  #     series="IRONMAN",
  #     results_url="https://www.ironman.com/im-world-championship-kona-results"),
  #   ))
  # ]
  # 70.3 World Championship,IRONMAN-70.3,https://www.ironman.com/im703-world-championship-2024-results
  # IRONMAN World Championship,IRONMAN,https://www.ironman.com/im-world-championship-kona-results
  results = await_pooled_jobs(jobs, t=args.t)

  for r in results:
    if r.status != JobStatus.FULFILLED:
      print(f"Job (args={r.args}) failed with exception: {r.reason}.")

  print("DONE")


if __name__ == "__main__":
  main()
  # url = "https://www.ironman.com/im703-world-championship-2024-results"
  # crawl(url)