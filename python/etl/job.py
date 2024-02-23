from enum import Enum

from dataclasses import dataclass
from typing import Any, Callable, Tuple, Optional

from concurrent.futures import ThreadPoolExecutor, wait


class JobStatus(Enum):
  """Represents the status of a job."""
  FULFILLED = "fulfilled"
  REJECTED = "rejected"


@dataclass
class Job:
  """Represents a callable job with arguments.

  It's ok if the `execute` method raises an exception. The exception will be
  caught and returned in the result (see below).
  
  See: https://how.wtf/how-to-wait-for-all-threads-to-finish-in-python.html
  """
  func: Callable[..., Any]
  args: Tuple[Any, ...] = ()
  kwargs: dict[str, Any] = None

  def execute(self):
    return self.func(*self.args, **(self.kwargs or {}))
  

@dataclass
class JobResult:
  """Represents the result of a job.
  
  See: https://how.wtf/how-to-wait-for-all-threads-to-finish-in-python.html
  """
  status: str
  value: Optional[Any] = None
  reason: Optional[Exception] = None
  args: Tuple[Any, ...] = ()


def await_pooled_jobs(jobs: list[Job], t: int = 4) -> list[JobResult]:
  """Execute a list of jobs and return the results.
  
  If a job fails, the result will contain the exception that was raised.
  """
  with ThreadPoolExecutor(max_workers=t) as executor:
    # Submit the jobs to the executor.
    futures = {executor.submit(job.execute): job.args for job in jobs}

    # Wait for all of the jobs to finish.
    wait(futures)

    # Gather results (or exceptions if they occurred).
    results = []
    for future in futures:
      if future.exception():
        results.append(JobResult(args=futures[future], status=JobStatus.REJECTED, reason=future.exception()))
      else:
        results.append(JobResult(args=futures[future], status=JobStatus.FULFILLED, value=future.result()))

    return results