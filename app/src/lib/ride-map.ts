import type { Feature, LineString, Point } from "geojson"

import type { RideSample } from "@/lib/cda-analysis"

export type GpsRideSample = RideSample & {
  latitudeDegrees: number
  longitudeDegrees: number
}

export type GeographicBounds = [[number, number], [number, number]]

export function isValidGpsSample(sample: RideSample): sample is GpsRideSample {
  return (
    Number.isFinite(sample.latitudeDegrees) &&
    Number.isFinite(sample.longitudeDegrees) &&
    sample.latitudeDegrees! >= -90 &&
    sample.latitudeDegrees! <= 90 &&
    sample.longitudeDegrees! >= -180 &&
    sample.longitudeDegrees! <= 180
  )
}

export function gpsSamples(samples: RideSample[]): GpsRideSample[] {
  return samples.filter(isValidGpsSample)
}

export function routeGeoJson(samples: RideSample[]): Feature<LineString> | null {
  const coordinates = gpsSamples(samples).map((sample) => [sample.longitudeDegrees, sample.latitudeDegrees])
  if (coordinates.length < 2) return null

  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates },
  }
}

export function routePointGeoJson(sample: GpsRideSample): Feature<Point> {
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "Point", coordinates: [sample.longitudeDegrees, sample.latitudeDegrees] },
  }
}

export function geographicBounds(samples: GpsRideSample[]): GeographicBounds | null {
  if (samples.length === 0) return null

  let west = samples[0].longitudeDegrees
  let east = west
  let south = samples[0].latitudeDegrees
  let north = south

  for (const sample of samples.slice(1)) {
    west = Math.min(west, sample.longitudeDegrees)
    east = Math.max(east, sample.longitudeDegrees)
    south = Math.min(south, sample.latitudeDegrees)
    north = Math.max(north, sample.latitudeDegrees)
  }

  return [[west, south], [east, north]]
}

/** Finds the closest sample in a time-sorted array of GPS-bearing samples. */
export function nearestGpsSample(samples: GpsRideSample[], elapsedSeconds: number): GpsRideSample | null {
  if (samples.length === 0 || !Number.isFinite(elapsedSeconds)) return null
  if (elapsedSeconds <= samples[0].elapsedSeconds) return samples[0]
  if (elapsedSeconds >= samples[samples.length - 1].elapsedSeconds) return samples[samples.length - 1]

  let lower = 0
  let upper = samples.length - 1
  while (lower + 1 < upper) {
    const middle = Math.floor((lower + upper) / 2)
    if (samples[middle].elapsedSeconds <= elapsedSeconds) lower = middle
    else upper = middle
  }

  return elapsedSeconds - samples[lower].elapsedSeconds <= samples[upper].elapsedSeconds - elapsedSeconds
    ? samples[lower]
    : samples[upper]
}
