import { beforeEach, describe, expect, it, vi } from "vitest"

const parseAsync = vi.hoisted(() => vi.fn())

vi.mock("fit-file-parser", () => ({
  default: class MockFitParser {
    parseAsync = parseAsync
  },
}))

import { parseFitFile } from "@/lib/fit-import"

function fitFile() {
  const file = new File(["fit"], "ride.fit", { type: "application/octet-stream" })
  Object.defineProperty(file, "arrayBuffer", { value: vi.fn().mockResolvedValue(new ArrayBuffer(3)) })
  return file
}

beforeEach(() => {
  parseAsync.mockReset()
})

describe("parseFitFile coordinates", () => {
  it("keeps the degree coordinates returned by fit-file-parser", async () => {
    parseAsync.mockResolvedValue({
      records: Array.from({ length: 30 }, (_, index) => ({
        timestamp: new Date(Date.UTC(2026, 0, 1, 12, 0, index)),
        power: 200,
        speed: 10,
        distance: index * 10,
        altitude: 25,
        position_lat: 42.3601 + index * 0.0001,
        position_long: -71.0589 + index * 0.0001,
      })),
    })

    const ride = await parseFitFile(fitFile())

    expect(ride.samples[0].latitudeDegrees).toBe(42.3601)
    expect(ride.samples[0].longitudeDegrees).toBe(-71.0589)
    expect(ride.samples.at(-1)?.latitudeDegrees).toBeCloseTo(42.363)
    expect(ride.hasGps).toBe(true)
  })
})
