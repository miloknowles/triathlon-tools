import { describe, expect, it } from "vitest"

import { analyzeCda, buildEnergyWindows, type AnalysisSettings, type RideSample } from "@/lib/cda-analysis"

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

    expect(Math.abs(result.cda - 0.25)).toBeLessThan(0.01)
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
      /at least three analysis windows/
    )
  })

  it("validates settings before constructing windows", () => {
    expect(() => buildEnergyWindows(syntheticOutAndBack(), { ...settings, windowSeconds: 15 })).not.toThrow()
    expect(() => analyzeCda(syntheticOutAndBack(), { ...settings, windowSeconds: 14 })).toThrow(/Window length/)
    expect(() => analyzeCda(syntheticOutAndBack(), { ...settings, airDensityKgM3: 0 })).toThrow(/Air density/)
    expect(() => analyzeCda(syntheticOutAndBack(), { ...settings, drivetrainEfficiency: 2 })).toThrow(/Drivetrain efficiency/)
  })

  it("requires GPS and altitude instead of silently assuming still air or flat ground", () => {
    const samples = syntheticOutAndBack()
    expect(() => analyzeCda(samples.map((sample) => ({ ...sample, latitudeDegrees: null, longitudeDegrees: null })), settings)).toThrow(/GPS coordinates/)
    expect(() => analyzeCda(samples.map((sample) => ({ ...sample, altitudeMeters: null })), settings)).toThrow(/Altitude data/)
  })

  it("rejects windows with sparse GPS or a power dropout", () => {
    const samples = syntheticOutAndBack()
    const sparseGps = samples.map((sample, index) => index % 5 === 0 ? sample : { ...sample, latitudeDegrees: null, longitudeDegrees: null })
    expect(() => analyzeCda(sparseGps, settings)).toThrow(/Not enough complete/)

    const droppedPower = samples.map((sample) => sample.elapsedSeconds === 30 ? { ...sample, powerWatts: null } : sample)
    expect(buildEnergyWindows(droppedPower, settings)).toHaveLength(23)
  })

  it("keeps zero-power coasting samples in a complete window", () => {
    const samples = syntheticOutAndBack().map((sample) =>
      sample.elapsedSeconds >= 20 && sample.elapsedSeconds <= 25 ? { ...sample, powerWatts: 0 } : sample
    )
    const windows = buildEnergyWindows(samples, settings)

    expect(windows).toHaveLength(24)
    expect(windows[0].durationSeconds).toBe(60)
    expect(windows[0].averagePowerWatts).toBeLessThan(buildEnergyWindows(syntheticOutAndBack(), settings)[0].averagePowerWatts)
  })

  it("requires repeated travel in reciprocal directions", () => {
    let longitude = 0
    const oneWay = syntheticOutAndBack().map((sample, index) => {
      if (index > 0) longitude += (sample.speedMps ?? 0) / EARTH_RADIUS_METERS * (180 / Math.PI)
      return { ...sample, longitudeDegrees: longitude }
    })
    expect(() => analyzeCda(oneWay, settings)).toThrow(/opposite directions/)
  })

  it("does not let implausible windows determine which observations enter the wind fit", () => {
    const corruptedWindows = new Set([3, 8, 13, 18])
    const samples = syntheticOutAndBack().map((sample) => {
      const windowIndex = Math.min(23, Math.floor(Math.max(0, sample.elapsedSeconds - 1) / settings.windowSeconds))
      return corruptedWindows.has(windowIndex) && sample.powerWatts !== null
        ? { ...sample, powerWatts: sample.powerWatts * 2.5 }
        : sample
    })

    const result = analyzeCda(samples, settings)

    expect(Math.abs(result.cda - 0.25)).toBeLessThan(0.01)
    expect(result.estimatedWindEastMps).toBeCloseTo(2, 0)
    expect(result.includedWindowCount).toBeLessThan(result.totalWindowCount)
  })

  it("rejects duplicate or out-of-order timestamps", () => {
    const samples = syntheticOutAndBack()
    samples[10] = { ...samples[10], elapsedSeconds: samples[9].elapsedSeconds }
    expect(() => analyzeCda(samples, settings)).toThrow(/unique timestamps/)
  })
})
