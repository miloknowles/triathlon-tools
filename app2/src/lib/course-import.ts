import type { CourseData } from "@/lib/simulator"

export const MAX_GPX_BYTES = 20 * 1024 * 1024
export const MAX_GPX_POINTS = 200_000

type SourcePoint = {
  latitude: number
  longitude: number
  elevation: number | null
  segment: number
}

type LocatedPoint = SourcePoint & { distance: number }

const EARTH_RADIUS_METERS = 6_371_000
const SMOOTHING_RADIUS_METERS = 25

function elementsByLocalName(root: ParentNode, localName: string) {
  return Array.from(root.querySelectorAll("*")).filter((element) => element.localName === localName)
}

function directChildText(element: Element, localName: string) {
  const child = Array.from(element.children).find((candidate) => candidate.localName === localName)
  return child?.textContent ?? null
}

function parsePoint(element: Element, segment: number): SourcePoint | null {
  const latitudeText = element.getAttribute("lat")
  const longitudeText = element.getAttribute("lon")
  if (!latitudeText?.trim() || !longitudeText?.trim()) return null

  const latitude = Number(latitudeText)
  const longitude = Number(longitudeText)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null
  }

  const elevationText = directChildText(element, "ele")
  const elevation = elevationText === null || elevationText.trim() === "" ? null : Number(elevationText)
  return {
    latitude,
    longitude,
    elevation: elevation !== null && Number.isFinite(elevation) ? elevation : null,
    segment,
  }
}

function haversineMeters(first: SourcePoint, second: SourcePoint) {
  const toRadians = Math.PI / 180
  const latitudeDelta = (second.latitude - first.latitude) * toRadians
  const longitudeDelta = (second.longitude - first.longitude) * toRadians
  const firstLatitude = first.latitude * toRadians
  const secondLatitude = second.latitude * toRadians
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(value)))
}

function removeConsecutiveDuplicates(points: SourcePoint[]) {
  const result: SourcePoint[] = []
  for (const point of points) {
    const previous = result.at(-1)
    if (previous && previous.segment === point.segment && previous.latitude === point.latitude && previous.longitude === point.longitude) {
      if (previous.elevation === null && point.elevation !== null) previous.elevation = point.elevation
      continue
    }
    result.push(point)
  }
  return result
}

function addDistances(points: SourcePoint[]) {
  let distance = 0
  return points.map((point, index): LocatedPoint => {
    const previous = points[index - 1]
    if (previous && previous.segment === point.segment) distance += haversineMeters(previous, point)
    return { ...point, distance }
  })
}

function interpolateIsolatedElevations(points: LocatedPoint[]) {
  return points.map((point, index) => {
    if (point.elevation !== null) return point
    const previous = points[index - 1]
    const next = points[index + 1]
    if (!previous || !next || previous.segment !== point.segment || next.segment !== point.segment
      || previous.elevation === null || next.elevation === null) return point

    const span = next.distance - previous.distance
    const ratio = span > 0 ? (point.distance - previous.distance) / span : 0.5
    return { ...point, elevation: previous.elevation + (next.elevation - previous.elevation) * ratio }
  })
}

function smoothElevations(points: Array<LocatedPoint & { elevation: number }>) {
  const elevations: number[] = []
  let left = 0
  let right = 0
  let sum = 0

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]
    while (left < index && (points[left].segment !== point.segment || points[left].distance < point.distance - SMOOTHING_RADIUS_METERS)) {
      if (right > left) sum -= points[left].elevation
      left += 1
    }
    if (right < index) {
      right = index
      sum = 0
      left = index
    }
    while (right < points.length && points[right].segment === point.segment && points[right].distance <= point.distance + SMOOTHING_RADIUS_METERS) {
      sum += points[right].elevation
      right += 1
    }
    elevations.push(sum / (right - left))
  }
  return elevations
}

export function parseGpx(xml: string, byteSize = new Blob([xml]).size): CourseData {
  if (byteSize > MAX_GPX_BYTES) throw new Error("GPX files must be 20 MB or smaller.")

  const document = new DOMParser().parseFromString(xml, "application/xml")
  if (elementsByLocalName(document, "parsererror").length > 0 || document.documentElement.localName !== "gpx") {
    throw new Error("This file is not valid GPX XML.")
  }

  const trackElements = elementsByLocalName(document, "trkpt")
  const routeElements = elementsByLocalName(document, "rtept")
  if (trackElements.length + routeElements.length > MAX_GPX_POINTS) {
    throw new Error("GPX files may contain at most 200,000 track or route points.")
  }
  const pointElements = trackElements.length ? trackElements : routeElements
  if (pointElements.length < 2) throw new Error("The GPX file does not contain enough track or route points.")

  const segmentIds = new Map<Element, number>()
  if (trackElements.length) {
    elementsByLocalName(document, "trkseg").forEach((segment, index) => segmentIds.set(segment, index))
  }
  const sourcePoints = pointElements.flatMap((element) => {
    const segment = trackElements.length
      ? segmentIds.get(element.parentElement as Element) ?? 0
      : 0
    const point = parsePoint(element, segment)
    return point ? [point] : []
  })

  const withDistances = addDistances(removeConsecutiveDuplicates(sourcePoints))
  const completePoints = interpolateIsolatedElevations(withDistances).filter(
    (point): point is LocatedPoint & { elevation: number } => point.elevation !== null
  )
  if (completePoints.length < 2) throw new Error("The GPX file does not contain enough usable elevation points.")

  const initialDistance = completePoints[0].distance
  completePoints.forEach((point) => { point.distance -= initialDistance })
  if ((completePoints.at(-1)?.distance ?? 0) <= 0) {
    throw new Error("The GPX file does not contain enough usable course distance.")
  }

  const smoothedElevations = smoothElevations(completePoints)
  const data = completePoints.map((point, index) => {
    const previous = completePoints[index - 1]
    const continuesSegment = previous && previous.segment === point.segment
    const distanceDelta = continuesSegment ? point.distance - previous.distance : 0
    const elevationDelta = continuesSegment ? smoothedElevations[index] - smoothedElevations[index - 1] : 0
    return {
      x: point.distance,
      y: smoothedElevations[index],
      a: continuesSegment ? Math.atan2(elevationDelta, distanceDelta) : 0,
    }
  })
  const totalGainMeters = data.reduce((gain, point, index) => {
    const previous = data[index - 1]
    return previous ? gain + Math.max(0, point.y - previous.y) : gain
  }, 0)

  return {
    data,
    meta: {
      totalDistanceMeters: data.at(-1)?.x ?? 0,
      totalGainMeters,
    },
  }
}

export function courseJson(course: CourseData) {
  return `${JSON.stringify(course, null, 2)}\n`
}

export function courseJsonFilename(gpxFilename: string) {
  const basename = gpxFilename.split(/[\\/]/).at(-1) || "imported-course.gpx"
  const withoutExtension = basename.replace(/\.gpx$/i, "")
  const safe = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "")
    .slice(0, 120)
  return `${safe || "imported-course"}.json`
}
