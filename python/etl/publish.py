import sys; sys.path.extend([".", "..", "../.."])

import argparse
import json
import os
from enum import Enum
import pandas as pd
from pydantic import BaseModel

from utils.paths import tasks_folder, data_folder


class Series(str, Enum):
  IRONMAN = "IRONMAN"
  IRONMAN_703 = "IRONMAN-70.3"
  IRONMAN_5150 = "5150-Triathlon-Series"


class Subevent(BaseModel):
  label: str
  id: str


class RaceEntry(BaseModel):
  id: str
  name: str
  series: Series
  subevents: list[Subevent]


def detect_gender(subevent_id: str):
  df = pd.read_csv(data_folder(f"im/csv/{subevent_id}.csv"))
  F = df.ContactGender.value_counts().get("F", 0)
  M = df.ContactGender.value_counts().get("M", 0)
  F = F / (F + M)
  M = M / (F + M)
  if F > 0.9:
    return "F"
  elif M > 0.9:
    return "M"
  else:
    return "MF"


def rank_splits(data: dict):
  """Rank everyone's splits overall, as well as based on gender and age group."""
  df = pd.DataFrame(data)

  df["Gender"] = df.AgeGroup.map(lambda ag: ag[0] if not pd.isna(ag) else pd.NA)
  df["FinishRankGroup"] = df[df.FinishTime > 0].groupby(by=["AgeGroup"])["FinishTime"].rank(method="min", ascending=True)
  df["SwimRankGroup"] = df[df.SwimTime > 0].groupby(by=["AgeGroup"])["SwimTime"].rank(method="min", ascending=True)
  df["BikeRankGroup"] = df[df.BikeTime > 0].groupby(by=["AgeGroup"])["BikeTime"].rank(method="min", ascending=True)
  df["RunRankGroup"] = df[df.RunTime > 0].groupby(by=["AgeGroup"])["RunTime"].rank(method="min", ascending=True)

  df["FinishRankGender"] = df[df.FinishTime > 0].groupby(by=["Gender"])["FinishTime"].rank(method="min", ascending=True)
  df["SwimRankGender"] = df[df.SwimTime > 0].groupby(by=["Gender"])["SwimTime"].rank(method="min", ascending=True)
  df["BikeRankGender"] = df[df.BikeTime > 0].groupby(by=["Gender"])["BikeTime"].rank(method="min", ascending=True)
  df["RunRankGender"] = df[df.RunTime > 0].groupby(by=["Gender"])["RunTime"].rank(method="min", ascending=True)

  df["FinishRankOverall"] = df[df.FinishTime > 0]["FinishTime"].rank(method="min", ascending=True)
  df["SwimRankOverall"] = df[df.SwimTime > 0]["SwimTime"].rank(method="min", ascending=True)
  df["BikeRankOverall"] = df[df.BikeTime > 0]["BikeTime"].rank(method="min", ascending=True)
  df["RunRankOverall"] = df[df.RunTime > 0]["RunTime"].rank(method="min", ascending=True)

  df.fillna(-1, inplace=True)

  return df.to_dict(orient="records")


def main():
  """Process and copy results to the `triathlon-data` repository."""
  parser = argparse.ArgumentParser(description="Process and copy results to the `triathlon-data` repository.")
  parser.add_argument("--index", help="Where to put the index file", required=True, type=str)
  parser.add_argument("--data", help="Where to put the data files", type=str, default=None)
  args = parser.parse_args()

  df = pd.read_csv(tasks_folder("im/subevents.csv"))

  def get_race_name(url: str):
    name = url.split("/")[-1].replace("-results", "").lower()

    if "im-world-championship" in name:
      return "im-world-championship"
    elif "im703-world-championship" in name:
      return "im703-world-championship"

    return name

  df["id"] = df.results_url.map(get_race_name)
  df["name"] = df.series.map(lambda s: {"IRONMAN-70.3": "70.3"}.get(s, s)) + " " + df.name.map(lambda n: n.replace("IRONMAN ", "").replace("70.3 ", ""))

  ids = df.id.unique()
  out = {}

  for id in ids:
    df_ = df[df.id == id].copy()

    entry = RaceEntry(
      id=id,
      name=df_.name.iloc[0],
      series=Series(df_.series.iloc[0]),
      subevents=[]
    )

    for row in df_.itertuples():
      full_subevent_id = f"{row.id}-{row.year}"

      # if "world championship" in row.name.lower():
      #   gender = detect_gender(row.subevent_id)
      #   full_subevent_id += "-" + gender.lower()
      
      print(full_subevent_id)

      entry.subevents.append(Subevent(label=row.year, id=full_subevent_id))

      if args.data:
        with open(data_folder(f"im/json/{row.subevent_id}.json")) as f:
          data = json.load(f)

        if len(data["data"]) == 0:
          print("Warning: No data found for this subevent. Skipping.")
          continue

        data["data"] = rank_splits(data["data"])

        with open(os.path.join(args.data, f"{full_subevent_id}.json"), "w") as f:
          json.dump(data, f, indent=2)

    out[id] = entry

  with open(args.index, "w") as f:
    json.dump({id: out[id].dict() for id in out}, f, indent=2)
  
  print("DONE")


if __name__ == "__main__":
  main()