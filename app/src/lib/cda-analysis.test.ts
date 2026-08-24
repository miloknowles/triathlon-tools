import { describe, expect, it } from "vitest"

import { analyzeCda, type AnalysisSettings, type RideSample } from "@/lib/cda-analysis"

const GRAVITY = 9.80665
const EARTH_RADIUS_METERS = 6_371_000

function syntheticOutAndBack() {
  const mass = 85
  const crr = 0.004
  const cda = 0.25
  const density = 1.2
  const efficiency = 0.975
  const windEast = 2
  let longitude = 0
  let distance = 0
  const samples: RideSample[] = []

  for (let second = 0; second <= 24 * 60; second += 1) {
    const leg = Math.floor(Math.max(0, second - 1) / 120)
    const direction = leg % 2 === 0 ? 1 : -1
    const speed = [8, 10, 12][Math.floor(leg / 2) % 3]
    const forwardAirSpeed = speed - windEast * direction
    const force = mass * GRAVITY * crr + 0.5 * density * cda * forwardAirSpeed ** 2
    if (second > 0) {
      longitude += direction * speed / EARTH_RADIUS_METERS * (180 / Math.PI)
      distance += speed
    }
    samples.push({
      elapsedSeconds: second,
      timestamp: new Date(second * 1000),
      powerWatts: force * speed / efficiency,
      speedMps: speed,
      distanceMeters: distance,
      altitudeMeters: 0,
      latitudeDegrees: 0,
      longitudeDegrees: longitude,
    })
  }
  return samples
}

const settings: AnalysisSettings = {
  riderMassKg: 75,
  bikeMassKg: 10,
  drivetrainEfficiency: 0.975,
  airDensityKgM3: 1.2,
  crr: 0.004,
  windowSeconds: 60,
  startSeconds: 0,
  endSeconds: 24 * 60,
  maxAbsoluteGrade: 0.01,
}

describe("analyzeCda", () => {
  it("recovers CdA and wind from clean opposite-direction windows", () => {
    const result = analyzeCda(syntheticOutAndBack(), settings)

    expect(result.cda).toBeCloseTo(0.25, 2)
    expect(result.estimatedWindEastMps).toBeCloseTo(2, 1)
    expect(result.estimatedWindNorthMps).toBeCloseTo(0, 1)
    expect(result.includedWindowCount).toBeGreaterThanOrEqual(10)
    expect(result.warnings).not.toContain("No strong opposite-direction pair was detected, so the wind estimate is weak.")
  })

  it("shows the expected Crr-to-CdA sensitivity", () => {
    const result = analyzeCda(syntheticOutAndBack(), settings)

    expect(result.sensitivity[0].cda).toBeGreaterThan(result.sensitivity[1].cda)
    expect(result.sensitivity[1].cda).toBeGreaterThan(result.sensitivity[2].cda)
  })

  it("rejects ranges with too few usable windows", () => {
    expect(() => analyzeCda(syntheticOutAndBack().slice(0, 100), { ...settings, endSeconds: 99 })).toThrow(
      /Not enough clean/
    )
  })
})
