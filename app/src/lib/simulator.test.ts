import { afterEach, describe, expect, it, vi } from "vitest"

import { loadCourse, simulate, type CourseData, type SimulatorParams } from "@/lib/simulator"

const course: CourseData = {
  data: [
    { x: 0, y: 10, a: 0 },
    { x: 100, y: 10, a: 0 },
  ],
  meta: { totalDistanceMeters: 100, totalGainMeters: 0 },
}

const params: SimulatorParams = {
  avgPowerWatts: 250,
  avgCdA: 0.28,
  racePositionPercent: 95,
  avgCrr: 0.00375,
  lossDrivetrain: 4.7,
  massBikeKg: 10,
  massRiderKg: 75,
  ambientTempCelsius: 20,
  relativeHumidity: 50,
  maxSpeedMps: 80 / 3.6,
}

afterEach(() => vi.restoreAllMocks())

describe("course simulation sources", () => {
  it("loads a preset URL and passes its data to the simulation engine", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(course)))
    const loaded = await loadCourse("/courses/test.json")
    const result = simulate(loaded, params)

    expect(fetchMock).toHaveBeenCalledWith("/courses/test.json")
    expect(result.totalDistanceMeters).toBe(100)
    expect(result.states.length).toBeGreaterThan(0)
  })

  it("simulates custom CourseData without fetching a URL", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    const result = simulate(course, params)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.states.at(-1)?.x).toBeGreaterThanOrEqual(100)
    expect(result.states.some((state) => Number.isFinite(state.alt) && Number.isFinite(state.v))).toBe(true)
  })

  it("reports preset loading failures and invalid course data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("no", { status: 404 }))
    await expect(loadCourse("/missing.json")).rejects.toThrow("could not be loaded")
    expect(() => simulate({ data: [], meta: { totalDistanceMeters: 0, totalGainMeters: 0 } }, params)).toThrow("enough data")
  })

  it("increases predicted time as time in race position decreases", () => {
    const comparisonCourse: CourseData = {
      data: [
        { x: 0, y: 10, a: 0 },
        { x: 10_000, y: 10, a: 0 },
      ],
      meta: { totalDistanceMeters: 10_000, totalGainMeters: 0 },
    }
    const perfect = simulate(comparisonCourse, { ...params, racePositionPercent: 100 })
    const dialed = simulate(comparisonCourse, { ...params, racePositionPercent: 99 })
    const typical = simulate(comparisonCourse, { ...params, racePositionPercent: 95 })

    expect(dialed.states.at(-1)?.t).toBeGreaterThan(perfect.states.at(-1)?.t ?? 0)
    expect(typical.states.at(-1)?.t).toBeGreaterThan(dialed.states.at(-1)?.t ?? 0)
  })

  it("rejects race-position percentages outside 0 to 100", () => {
    expect(() => simulate(course, { ...params, racePositionPercent: -1 })).toThrow("between 0% and 100%")
    expect(() => simulate(course, { ...params, racePositionPercent: 101 })).toThrow("between 0% and 100%")
  })

  it("accepts zero drivetrain loss without reducing power", () => {
    const zeroLoss = simulate(course, { ...params, lossDrivetrain: 0 })
    const equivalentPower = simulate(course, {
      ...params,
      avgPowerWatts: params.avgPowerWatts / 0.975,
      lossDrivetrain: 2.5,
    })

    expect(zeroLoss.states.at(-1)?.t).toBeCloseTo(equivalentPower.states.at(-1)?.t ?? 0, 8)
    expect(zeroLoss.states.at(-1)?.v).toBeCloseTo(equivalentPower.states.at(-1)?.v ?? 0, 8)
  })

  it("rejects drivetrain losses outside 0 to 15 percent", () => {
    expect(() => simulate(course, { ...params, lossDrivetrain: -0.1 })).toThrow("between 0% and 15%")
    expect(() => simulate(course, { ...params, lossDrivetrain: 15.1 })).toThrow("between 0% and 15%")
  })

  it("caps downhill speed and increases elapsed time when braking is needed", () => {
    const downhillCourse: CourseData = {
      data: [
        { x: 0, y: 1000, a: -0.1 },
        { x: 10_000, y: 0, a: -0.1 },
      ],
      meta: { totalDistanceMeters: 10_000, totalGainMeters: 0 },
    }
    const capped = simulate(downhillCourse, { ...params, maxSpeedMps: 10 })
    const uncapped = simulate(downhillCourse, { ...params, maxSpeedMps: 100 })

    expect(Math.max(...capped.states.map((state) => state.v))).toBeLessThanOrEqual(10)
    expect(capped.states.at(-1)?.t).toBeGreaterThan(uncapped.states.at(-1)?.t ?? 0)
  })

  it("rejects a maximum speed at or below the minimum simulation speed", () => {
    expect(() => simulate(course, { ...params, maxSpeedMps: 1 })).toThrow("Maximum speed")
    expect(() => simulate(course, { ...params, maxSpeedMps: Number.POSITIVE_INFINITY })).toThrow("Maximum speed")
  })
})
