import sys; sys.path.append('..')
import fitparse
import pandas as pd
import math


def parse_fitfile(
  filepath: str,
  columns: list[str],
  verbose: bool = False,
) -> pd.DataFrame:
  """Parse a .fit file into a format the simulator can use.

  Notes
  -----
  The file must include at least timestamp, distance, and altitude.
  """
  ff = fitparse.FitFile(filepath)
  df = {col: [] for col in columns}

  generator = ff.get_messages("record")

  while True:
    try:
      record = next(generator)

      # Get the record into nicer key-value format.
      record_data = {}
      for data in record:
        record_data[data.name] = data.value
      if verbose:
        print(record_data.keys())

      if any([col not in record_data for col in df]):
        ts = record_data["timestamp"]
        if verbose:
          print(f"Skipping incomplete record @ {ts}")
        continue

      for col in df:
        df[col].append(record_data[col])

    except StopIteration:
      break

    except Exception as e:
      print("Error while iterating over records:")
      print(e)

  return pd.DataFrame(df)
