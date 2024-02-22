from bs4 import BeautifulSoup
import requests
import pandas as pd
import os

from utils.paths import tasks_folder


def update_from_google_sheets():
  """Scrape information about active races from the Ironman spreadsheet.

  Yes... they do keep everything in one big spreadsheet.

  https://docs.google.com/spreadsheets/d/1yLtxUETnuF3UZLmypYkAK6Vj4PE9Fo_BT-WsA4oE_YU/edit#gid=440730663
  """
  base_url = "https://sheets.googleapis.com/v4/spreadsheets/1yLtxUETnuF3UZLmypYkAK6Vj4PE9Fo_BT-WsA4oE_YU/values/Race-Catalog?key=AIzaSyC9s2sNhwUZOUXJfnyt-cD4k4nUyY-3HBs"

  print("Updating list of known races from Google Sheets...")
  print(base_url)

  data = requests.get(base_url).json()["values"]
  header = data[0]
  data = data[1:]

  print("HEADER:")
  print(header)

  name_ix: int = header.index("Title \nIRONMAN/IRONMAN 70.3 will be appended")
  series_ix: int = header.index('Brand/Series/Distance')
  url_ix: int = header.index("Race Event Page Link")

  # Load out current master list of races.
  df = pd.read_csv(tasks_folder("im/races.csv"), index_col="name")

  for row in data:
    name = row[name_ix]
    series = row[series_ix]
    url = row[url_ix] + '-results'

    # Update if this name doesn't exist.
    if name not in df.index:
      print(f"Found new race called '{name}'")
      df.loc[name] = [series, url]

  df.to_csv(tasks_folder("im/races.csv"), index=True)

  print("DONE")


def update_from_discountinued():
  base_url = "https://www.ironman.com/discontinued-races"

  soup = BeautifulSoup(requests.get(base_url).text)
  h3s = soup.find_all("h3")

  # Load out current master list of races.
  df = pd.read_csv(tasks_folder("im/races.csv"), index_col="name")

  for h3 in h3s:
    # IRONMAN-70.3
    # IRONMAN
    # 5150-Triathlon-Series
    series = {
      "IRONMAN 70.3": "IRONMAN-70.3",
      "IRONMAN": "IRONMAN",
      "5150 Triathlon Series": "5150-Triathlon-Series"
    }[h3.find("span").text]

    div = h3.parent
    links = div.find_all("a")

    for link in links:
      name = link.text
      href = f'https://www.ironman.com{link["href"]}' if link["href"].startswith("/") else link["href"]

      if name not in df.index:
        print(f"Found discontinued race called '{name}'")
        df.loc[name] = [series, href]

  df.to_csv(tasks_folder("im/races.csv"))


if __name__ == "__main__":
  """Gather a list of all the Ironman races (current and discontinued)."""
  update_from_google_sheets()
  update_from_discountinued()