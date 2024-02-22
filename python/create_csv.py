import glob
import json
import pandas as pd

from utils.paths import data_folder


def create_csv(path: str, anonymized: bool = True) -> pd.DataFrame:
  """Create a CSV file from a given path.
  
  If `anonymized` is True, the CSV will not contain information that could identify the person.
  """
  with open(path, "r") as file:
    data = json.load(file)["data"]

  if len(data) == 0:
    return None
  
  for d in data:
    if "Contact" not in d or d["Contact"] is None:
      d["ContactFullName"] = "<missing>"
      d["ContactGender"] = "<missing>"
    else:
      d["ContactFullName"] = d["Contact"]["FullName"]
      d["ContactGender"] = d["Contact"]["Gender"]
    d["CountryISO2"] = d["Country"]["ISO2"]
    del d["Contact"]
    del d["Country"]
    del d["Subevent"]

  df = pd.DataFrame(data)

  if anonymized:
    df.drop(columns=["ContactFullName", "BibNumber", "ContactId"], inplace=True)

  return df


def main():
  """Create CSV files from the results JSON files."""
  filenames = glob.glob(data_folder("im/json/*.json"))

  for filename in filenames:
    print(filename)
    print(f"Processing {filename.split("/")[-1]}...")

    # Output to the csv folder.
    csv = filename.replace("json", "csv")

    df = create_csv(filename, anonymized=True)

    if df is None:
      print("No data found! Skipping...")
      continue

    df.to_csv(csv.replace(".csv", ".anon.csv"), index=False)

    df = create_csv(filename, anonymized=False)
    df.to_csv(csv, index=False)

  print("DONE")


if __name__ == "__main__":
  main()