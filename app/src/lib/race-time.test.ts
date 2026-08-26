import { describe, expect, it } from "vitest"

import {
  calculateRacePlan,
  distanceToMeters,
  durationFromPace,
  durationFromSpeed,
  formatDuration,
  metersPerSecondToSpeed,
  metersToDistance,
  parseDuration,
  RACE_PRESETS,
  runPaceToSecondsPerMeter,
  secondsPerMeterToRunPace,
  secondsPerMeterToSwimPace,
  speedToMetersPerSecond,
  swimPaceToSecondsPerMeter,
} from "@/lib/race-time"

describe("race distance conversions", () => {
  it.each([
    [1, "mi" as const, 1609.344],
    [1, "yd" as const, 0.9144],
    [1, "km" as const, 1000],
    [1, "m" as const, 1],
  ])("converts %s %s to meters", (value, unit, meters) => {
    expect(distanceToMeters(value, unit)).toBeCloseTo(meters, 8)
    expect(metersToDistance(meters, unit)).toBeCloseTo(value, 8)
  })

  it("defines all standard race presets exactly", () => {
    expect(RACE_PRESETS).toEqual([
      { name: "Sprint", swim: { distance: 750, unit: "m" }, bike: { distance: 20, unit: "km" }, run: { distance: 5, unit: "km" } },
      { name: "Olympic", swim: { distance: 1500, unit: "m" }, bike: { distance: 40, unit: "km" }, run: { distance: 10, unit: "km" } },
      { name: "Half", swim: { distance: 1.2, unit: "mi" }, bike: { distance: 56, unit: "mi" }, run: { distance: 13.1, unit: "mi" } },
      { name: "Full", swim: { distance: 2.4, unit: "mi" }, bike: { distance: 112, unit: "mi" }, run: { distance: 26.2, unit: "mi" } },
    ])
  })
})

describe("race pace and speed conversions", () => {
  it.each(["50yd", "50m", "100yd", "100m"] as const)("round trips swim pace in %s", (unit) => {
    expect(secondsPerMeterToSwimPace(swimPaceToSecondsPerMeter(95, unit), unit)).toBeCloseTo(95, 10)
  })

  it.each(["min/km", "min/mi"] as const)("round trips run pace in %s", (unit) => {
    expect(secondsPerMeterToRunPace(runPaceToSecondsPerMeter(480, unit), unit)).toBeCloseTo(480, 10)
  })

  it.each(["km/h", "mph"] as const)("round trips bike speed in %s", (unit) => {
    expect(metersPerSecondToSpeed(speedToMetersPerSecond(24.5, unit), unit)).toBeCloseTo(24.5, 10)
  })

  it("calculates pace- and speed-driven splits", () => {
    expect(durationFromPace(1500, swimPaceToSecondsPerMeter(120, "100m"))).toBe(1800)
    expect(durationFromSpeed(40000, speedToMetersPerSecond(20, "km/h"))).toBe(7200)
    expect(durationFromPace(10000, runPaceToSecondsPerMeter(300, "min/km"))).toBe(3000)
  })
})

describe("race time formatting and totals", () => {
  it("normalizes overflowing fields and rounds across boundaries", () => {
    expect(parseDuration("1:75")).toBe(135)
    expect(parseDuration("1:59:60")).toBe(7200)
    expect(formatDuration(3599.6)).toBe("01:00:00")
    expect(formatDuration(59.6, false)).toBe("1:00")
  })

  it("includes each transition once and hides incomplete totals", () => {
    expect(calculateRacePlan(1800, 120, 7200, 60, 3000).totalSeconds).toBe(12180)
    const incomplete = calculateRacePlan(1800, 120, null, 60, 3000)
    expect(incomplete.totalSeconds).toBeNull()
    expect(incomplete.missingDisciplines).toEqual(["bike"])
  })
})
