import { describe, expect, it } from "vitest"

import type { RideSample } from "@/lib/cda-analysis"
import { geographicBounds, gpsSamples, nearestGpsSample, routeGeoJson } from "@/lib/ride-map"

function sample(elapsedSeconds: number, latitudeDegrees: number | null, longitudeDegrees: number | null): RideSample {
  return {
    elapsedSeconds,
    timestamp: new Date(elapsedSeconds * 1000),
    powerWatts: 200,
    speedMps: 10,
    distanceMeters: elapsedSeconds * 10,
    altitudeMeters: 20,
    latitudeDegrees,
    longitudeDegrees,
  }
}

describe("ride map helpers", () => {
  it("builds a route from valid coordinates and skips missing or malformed positions", () => {
    const route = routeGeoJson([
      sample(0, 42, -71),
      sample(1, null, -70.9),
      sample(2, Number.NaN, -70.8),
      sample(3, 91, -70.7),
      sample(4, 42.1, -70.6),
    ])

    expect(route?.geometry.coordinates).toEqual([[-71, 42], [-70.6, 42.1]])
    expect(routeGeoJson([sample(0, 42, -71)])).toBeNull()
    expect(routeGeoJson([sample(0, null, null)])).toBeNull()
  })

  it("calculates bounds around all usable coordinates", () => {
    expect(geographicBounds(gpsSamples([
      sample(0, 42.2, -70.8),
      sample(1, 41.9, -71.2),
      sample(2, 42.1, -70.5),
    ]))).toEqual([[-71.2, 41.9], [-70.5, 42.2]])
    expect(geographicBounds([])).toBeNull()
  })

  it("finds the nearest GPS sample before, within, and after the time range", () => {
    const positions = gpsSamples([
      sample(0, 42, -71),
      sample(5, null, null),
      sample(10, 42.1, -70.9),
      sample(30, 42.2, -70.8),
    ])

    expect(nearestGpsSample(positions, -1)?.elapsedSeconds).toBe(0)
    expect(nearestGpsSample(positions, 6)?.elapsedSeconds).toBe(10)
    expect(nearestGpsSample(positions, 20)?.elapsedSeconds).toBe(10)
    expect(nearestGpsSample(positions, 29)?.elapsedSeconds).toBe(30)
    expect(nearestGpsSample(positions, 99)?.elapsedSeconds).toBe(30)
    expect(nearestGpsSample([], 10)).toBeNull()
  })
})
