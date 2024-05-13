import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.gzip import GZipMiddleware

from simulator.helpers import parse_fitfile, get_course_meta
from simulator.simulate import simulate, calculate_grade
from simulator.models import Parameters, Results, CourseName, State
from simulator.path_util import data_folder

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

origins = [
  "http://localhost:3000",
  "http://localhost:8000",
  "https://milo.fyi",
  "https://www.milo.fyi"
]

app.add_middleware(
  CORSMiddleware,
  allow_origins=origins,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)


def round_numbers(T: list[State], decimals: int = 2) -> list[State]:
  """Round numbers to a fixed decimal precision to reduce response size."""
  out = []
  for item in T:
    rounded = item.model_copy()
    for field in rounded.model_fields:
      if type(getattr(rounded, field)) == float:
        setattr(rounded, field, round(getattr(rounded, field), decimals))
    out.append(rounded)
  return out


@app.get('/healthcheck')
async def healthcheck():
  return "ok"


@app.get('/courses')
def get_courses():
  """Lists the available courses in the simulator."""
  return [k for k in CourseName]


@app.post('/simulate')
def simulate_endpoint(payload: Parameters):
  """Main endpoint for running bike simulations."""
  print(payload)
  start = time.time()

  try:
    meta = get_course_meta(payload.course_name)
  except KeyError:
    raise HTTPException(status_code=404, detail="Could not find a course with that name")

  df = parse_fitfile(data_folder(meta["file"]))
  distance = meta["distance"]

  T, E = simulate(
    payload,
    df,
    distance,
    ts=payload.timestep
  )

  T = round_numbers(T)

  total_time_sec = T[-1].t

  return Results.model_validate(dict(
    states=T,
    course_distance_m=distance,
    course_gain_m=meta["course_gain_m"],
    avg_speed_m_per_s=distance / total_time_sec,
    meta=dict(
      compute_sec=time.time() - start,
      compute_iters=len(T),
      simulation_sec=T[-1].t,
      errors=E
    )
  ))