import { describe, expect, it } from "vitest"

import {
  courseJson,
  courseJsonFilename,
  MAX_GPX_BYTES,
  MAX_GPX_POINTS,
  parseGpx,
} from "@/lib/course-import"

function gpx(body: string) {
  return `<?xml version="1.0"?><gpx version="1.1" xmlns="http://www.topografix.com/GPX/1/1">${body}</gpx>`
}

function track(points: string, extra = "") {
  return gpx(`<trk>${extra}<trkseg>${points}</trkseg></trk>`)
}

function point(latitude: string | number, longitude: string | number, elevation?: string | number) {
  return `<trkpt lat="${latitude}" lon="${longitude}">${elevation === undefined ? "" : `<ele>${elevation}</ele>`}</trkpt>`
}

describe("parseGpx", () => {
  it("imports track points and calculates distance, gain, and slope radians", () => {
    const course = parseGpx(track([
      point(0, 0, 10),
      point(0, 0.001, 20),
      point(0, 0.002, 15),
    ].join("")))

    expect(course.data).toHaveLength(3)
    expect(course.data[0]).toEqual({ x: 0, y: 10, a: 0 })
    expect(course.data[1].x).toBeCloseTo(111.195, 2)
    expect(course.data[1].a).toBeCloseTo(Math.atan2(10, course.data[1].x), 8)
    expect(course.meta.totalDistanceMeters).toBeCloseTo(222.39, 1)
    expect(course.meta.totalGainMeters).toBeCloseTo(10, 8)
  })

  it("falls back to route points but prefers tracks when both exist", () => {
    const routeOnly = parseGpx(gpx(`<rte><rtept lat="1" lon="1"><ele>5</ele></rtept><rtept lat="1" lon="1.001"><ele>7</ele></rtept></rte>`))
    expect(routeOnly.data).toHaveLength(2)

    const both = parseGpx(gpx(`<rte><rtept lat="1" lon="1"><ele>100</ele></rtept><rtept lat="1" lon="1.001"><ele>100</ele></rtept></rte><trk><trkseg>${point(0, 0, 1)}${point(0, 0.001, 2)}</trkseg></trk>`))
    expect(both.data[0].y).toBe(1)
  })

  it("combines track segments without inventing distance between them", () => {
    const course = parseGpx(gpx(`<trk><trkseg>${point(0, 0, 0)}${point(0, 0.001, 1)}</trkseg><trkseg>${point(10, 10, 20)}${point(10, 10.001, 21)}</trkseg></trk>`))
    expect(course.data).toHaveLength(4)
    expect(course.meta.totalDistanceMeters).toBeGreaterThan(220)
    expect(course.meta.totalDistanceMeters).toBeLessThan(222)
    expect(course.data[2].a).toBe(0)
  })

  it("rejects malformed or non-GPX XML", () => {
    expect(() => parseGpx("<gpx><trk>")).toThrow("valid GPX XML")
    expect(() => parseGpx("<not-gpx />")).toThrow("valid GPX XML")
  })

  it("skips bad coordinates and rejects insufficient usable coordinates", () => {
    const course = parseGpx(track(`${point("nope", 0, 5)}${point(0, 0, 10)}${point(0, 0.001, 12)}`))
    expect(course.data).toHaveLength(2)
    expect(() => parseGpx(track(`${point("nope", 0, 5)}${point(0, 0, 10)}`))).toThrow("usable elevation")
    expect(() => parseGpx(track(`<trkpt lon="0"><ele>5</ele></trkpt>${point(0, 0.001, 10)}`))).toThrow("usable elevation")
  })

  it("removes consecutive duplicate coordinates and keeps their usable elevation", () => {
    const course = parseGpx(track(`${point(0, 0)}${point(0, 0, 10)}${point(0, 0.001, 12)}`))
    expect(course.data).toHaveLength(2)
    expect(course.data[0].y).toBe(10)
  })

  it("interpolates an isolated missing elevation and rejects elevation-free files", () => {
    const course = parseGpx(track(`${point(0, 0, 10)}${point(0, 0.001)}${point(0, 0.002, 30)}`))
    expect(course.data).toHaveLength(3)
    expect(course.data[1].y).toBeCloseTo(20, 6)
    expect(() => parseGpx(track(`${point(0, 0)}${point(0, 0.001)}`))).toThrow("usable elevation")
  })

  it("enforces the file size and source point limits", () => {
    expect(() => parseGpx(gpx(""), MAX_GPX_BYTES + 1)).toThrow("20 MB")
    const tooManyPoints = `<trkpt/>`.repeat(MAX_GPX_POINTS + 1)
    expect(() => parseGpx(track(tooManyPoints))).toThrow("200,000")
  }, 20_000)
})

describe("course JSON export", () => {
  it("exports the preset-compatible schema as readable JSON", () => {
    const course = parseGpx(track(`${point(0, 0, 10)}${point(0, 0.001, 12)}`))
    const serialized = courseJson(course)
    expect(serialized).toContain('\n  "data": [')
    expect(JSON.parse(serialized)).toEqual(course)
    expect(Object.keys(JSON.parse(serialized))).toEqual(["data", "meta"])
  })

  it("sanitizes uploaded basenames and replaces the GPX extension", () => {
    expect(courseJsonFilename("../My Côte / race?.GPX")).toBe("race.json")
    expect(courseJsonFilename("...gpx")).toBe("imported-course.json")
    expect(courseJsonFilename("💥.gpx")).toBe("imported-course.json")
  })
})
