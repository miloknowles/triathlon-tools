import pandas as pd
import numpy as np
from pydantic import BaseModel
import math

G = 9.81 # m/s2


class Parameters(BaseModel):
  rider_mass_kg: float
  bike_mass_kg: float
  rho_kg_m3: float


def preprocess_columns(df):
  df["dy"] = df.altitude.diff(1)
  df["dx"] = df.distance.diff(1)
  df["grade"] = (df.dy / df.dx).fillna(0)
  df["theta"] = df.grade.map(math.atan).fillna(0)
  df["speed_diff"] = df.speed.diff(1).fillna(0)
  df["dt"] = df.timestamp.diff(1).fillna(0)
  df.dt = df.dt.map(lambda x: x.total_seconds() if type(x) == pd.Timedelta else x)
  return df


def estimate_parameters(df: pd.DataFrame, params: Parameters):
  """Estimate the drivetrain loss, Crr, and CdA from data.
  
  Required columns: `dt`, `speed`, `power`, `theta`, `speed_diff`.
  """
  dv = df.speed_diff.to_numpy()
  dt = df.dt.to_numpy()
  vt = df.speed.to_numpy()
  P_legs = df.power.to_numpy()
  theta = df.theta.to_numpy()
  m = params.rider_mass_kg + params.bike_mass_kg
  rho = params.rho_kg_m3

  b = dv + dt * G * np.sin(theta)
  c1 = dt * P_legs / (m * vt)
  c2 = -dt * G * np.cos(theta)
  c3 = -dt * rho * vt**2 / (2 * m)
  A = np.column_stack((c1, c2, c3))

  x, residuals, rank, s = np.linalg.lstsq(A, b)

  yhat = A @ x

  return x, residuals, rank, s, yhat, b


def estimate_parameters_twostep(
  df: pd.DataFrame, params: Parameters, verbose: bool = False
):
  """Estimate the drivetrain loss, Crr, and CdA from data.
  
  This function removes outliers before estimating the parameters.
  """
  _, _, _, _, yhat, b = estimate_parameters(df, params)

  # Calculate errors for outlier detection.
  df["error"] = b - yhat
  df["abs_error"] = np.abs(df.error)
  before = len(df)

  # Remove the top 5% of errors.
  df = df[df.abs_error < np.percentile(df.abs_error, 95)]

  if verbose:
    print(f"Removed {before - len(df)} outliers")

  x, residuals, rank, s, yhat, b = estimate_parameters(df, params)

  return x, residuals, rank, s, yhat, b, df