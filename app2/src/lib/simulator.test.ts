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
  avgCrr: 0.00375,
  lossDrivetrain: 4.7,
  massBikeKg: 10,
  massRiderKg: 75,
  ambientTempCelsius: 20,
  relativeHumidity: 50,
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
})
