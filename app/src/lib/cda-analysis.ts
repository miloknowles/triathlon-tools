export type RideSample = {
  elapsedSeconds: number
  timestamp: Date
  powerWatts: number | null
  speedMps: number | null
  distanceMeters: number | null
  altitudeMeters: number | null
  latitudeDegrees: number | null
  longitudeDegrees: number | null
}

export type AnalysisSettings = {
  riderMassKg: number
  bikeMassKg: number
  drivetrainEfficiency: number
  airDensityKgM3: number
  crr: number
  windowSeconds: number
  startSeconds: number
  endSeconds: number
  maxAbsoluteGrade: number
}

export type EnergyWindow = {
  index: number
  startSeconds: number
  endSeconds: number
  durationSeconds: number
  distanceMeters: number
  elevationChangeMeters: number
  averagePowerWatts: number
  averageSpeedMps: number
  headingDegrees: number
  headingCoherence: number
  directionalCoverage: number
  altitudeCoverage: number
  wheelEnergyJoules: number
  kineticEnergyChangeJoules: number
  path: Array<{
    distanceMeters: number
    speedMps: number
    east: number
    north: number
  }>
}

export type WindowEstimate = EnergyWindow & { cda: number; included: boolean }

export type CdaAnalysis = {
  cda: number
  cdaLow: number
  cdaHigh: number
  estimatedWindEastMps: number
  estimatedWindNorthMps: number
  estimatedWindSpeedMps: number
  estimatedWindFromDegrees: number
  windows: WindowEstimate[]
  includedWindowCount: number
  totalWindowCount: number
  sensitivity: Array<{ crr: number; cda: number }>
  warnings: string[]
}

const GRAVITY = 9.80665
const EARTH_RADIUS_METERS = 6_371_000
const MIN_DATA_COVERAGE = 0.95
const MIN_DIRECTIONAL_COVERAGE = 0.9
const MIN_ALTITUDE_COVERAGE = 0.9
const MAX_SAMPLE_GAP_SECONDS = 3

function median(values: number[]) {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle]
}

function percentile(values: number[], fraction: number) {
  if (values.length === 0) return Number.NaN
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * fraction
  const lower = Math.floor(position)
  const upper = Math.ceil(position)
  if (lower === upper) return sorted[lower]
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower)
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value))
}

function angularDifference(a: number, b: number) {
  return Math.abs(((a - b + 540) % 360) - 180)
}

function axisDifference(a: number, b: number) {
  return Math.min(angularDifference(a, b), angularDifference(a, (b + 180) % 360))
}

function routeAxisCount(windows: EnergyWindow[]) {
  const axes: number[] = []
  for (const window of windows) {
    if (!axes.some((axis) => axisDifference(axis, window.headingDegrees) < 30)) axes.push(window.headingDegrees)
  }
  return axes.length
}

function smoothNullable(values: Array<number | null>, radius: number) {
  return values.map((_, index) => {
    let total = 0
    let count = 0
    for (let offset = -radius; offset <= radius; offset += 1) {
      const value = values[index + offset]
      if (value !== null && Number.isFinite(value)) {
        total += value
        count += 1
      }
    }
    return count > 0 ? total / count : null
  })
}

function pathVector(previous: RideSample, current: RideSample, fallbackDistance: number) {
  if (
    previous.latitudeDegrees === null || previous.longitudeDegrees === null ||
    current.latitudeDegrees === null || current.longitudeDegrees === null
  ) return null

  const latitude = ((previous.latitudeDegrees + current.latitudeDegrees) / 2) * (Math.PI / 180)
  const north = (current.latitudeDegrees - previous.latitudeDegrees) * (Math.PI / 180) * EARTH_RADIUS_METERS
  let longitudeChange = current.longitudeDegrees - previous.longitudeDegrees
  if (longitudeChange > 180) longitudeChange -= 360
  if (longitudeChange < -180) longitudeChange += 360
  const east = longitudeChange * (Math.PI / 180) * EARTH_RADIUS_METERS * Math.cos(latitude)
  const gpsDistance = Math.hypot(east, north)
  if (gpsDistance < 0.2 || gpsDistance > Math.max(100, fallbackDistance * 3)) return null
  return { east: east / gpsDistance, north: north / gpsDistance }
}

function requireFiniteInRange(name: string, value: number, low: number, high: number) {
  if (!Number.isFinite(value) || value < low || value > high) {
    throw new Error(`${name} must be between ${low} and ${high}.`)
  }
}

function validateInputs(samples: RideSample[], settings: AnalysisSettings) {
  requireFiniteInRange("Rider mass", settings.riderMassKg, 20, 250)
  requireFiniteInRange("Bike and equipment mass", settings.bikeMassKg, 3, 80)
  requireFiniteInRange("Drivetrain efficiency", settings.drivetrainEfficiency, 0.8, 1)
  requireFiniteInRange("Air density", settings.airDensityKgM3, 0.7, 1.5)
  requireFiniteInRange("Crr", settings.crr, 0.001, 0.015)
  requireFiniteInRange("Window length", settings.windowSeconds, 15, 300)
  requireFiniteInRange("Maximum grade", settings.maxAbsoluteGrade, 0.001, 0.1)
  if (!Number.isFinite(settings.startSeconds) || !Number.isFinite(settings.endSeconds) || settings.startSeconds < 0 || settings.endSeconds <= settings.startSeconds) {
    throw new Error("The analysis start and end times are invalid.")
  }
  if (settings.endSeconds - settings.startSeconds < settings.windowSeconds * 3) {
    throw new Error("Select a range at least three analysis windows long.")
  }
  if (samples.length < 2) throw new Error("The ride contains too few samples to analyze.")
  for (let index = 0; index < samples.length; index += 1) {
    if (!Number.isFinite(samples[index].elapsedSeconds)) throw new Error("The ride contains an invalid timestamp.")
    if (index > 0 && samples[index].elapsedSeconds <= samples[index - 1].elapsedSeconds) {
      throw new Error("Ride samples must have unique timestamps in increasing order.")
    }
  }
  const selected = samples.filter((sample) => sample.elapsedSeconds >= settings.startSeconds && sample.elapsedSeconds <= settings.endSeconds)
  if (!selected.some((sample) => sample.latitudeDegrees !== null && sample.longitudeDegrees !== null)) {
    throw new Error("GPS coordinates are required to estimate heading and wind.")
  }
  if (!selected.some((sample) => sample.altitudeMeters !== null)) {
    throw new Error("Altitude data is required to account for changes in elevation.")
  }
}

export function buildEnergyWindows(samples: RideSample[], settings: AnalysisSettings): EnergyWindow[] {
  validateInputs(samples, settings)
  const smoothedAltitudes = smoothNullable(samples.map((sample) => sample.altitudeMeters), 7)
  const totalMassKg = settings.riderMassKg + settings.bikeMassKg
  const windows: EnergyWindow[] = []

  for (let windowStart = settings.startSeconds; windowStart + settings.windowSeconds <= settings.endSeconds + 1e-9; windowStart += settings.windowSeconds) {
    const windowEnd = windowStart + settings.windowSeconds
    let wheelEnergyJoules = 0
    let distanceMeters = 0
    let weightedPower = 0
    let elapsed = 0
    let altitudeElapsed = 0
    let eastTotal = 0
    let northTotal = 0
    let directionalDistance = 0
    const path: EnergyWindow["path"] = []
    let firstIndex = -1
    let lastIndex = -1
    let startSpeed = Number.NaN
    let endSpeed = Number.NaN
    let hasInteriorGap = false

    for (let index = 1; index < samples.length; index += 1) {
      const current = samples[index]
      const previous = samples[index - 1]
      if (previous.elapsedSeconds < windowStart || current.elapsedSeconds > windowEnd) continue
      const dt = current.elapsedSeconds - previous.elapsedSeconds
      if (dt <= 0 || dt > MAX_SAMPLE_GAP_SECONDS) {
        hasInteriorGap = true
        continue
      }
      const speed = current.speedMps
      const previousSpeed = previous.speedMps
      const power = current.powerWatts
      if (
        speed === null || previousSpeed === null || power === null ||
        !Number.isFinite(speed) || !Number.isFinite(previousSpeed) || !Number.isFinite(power) ||
        speed < 3 || previousSpeed < 3 || power < 0
      ) {
        hasInteriorGap = true
        continue
      }

      const fallbackDistance = ((speed + previousSpeed) / 2) * dt
      const recordedDistance = current.distanceMeters !== null && previous.distanceMeters !== null
        ? current.distanceMeters - previous.distanceMeters
        : Number.NaN
      const stepDistance = Number.isFinite(recordedDistance) && recordedDistance > 0 && recordedDistance < fallbackDistance * 3
        ? recordedDistance
        : fallbackDistance
      const vector = pathVector(previous, current, stepDistance)

      wheelEnergyJoules += power * settings.drivetrainEfficiency * dt
      weightedPower += power * dt
      elapsed += dt
      distanceMeters += stepDistance
      if (previous.altitudeMeters !== null && current.altitudeMeters !== null) altitudeElapsed += dt
      if (vector) {
        eastTotal += vector.east * stepDistance
        northTotal += vector.north * stepDistance
        directionalDistance += stepDistance
      }
      path.push({
        distanceMeters: stepDistance,
        speedMps: (speed + previousSpeed) / 2,
        east: vector?.east ?? Number.NaN,
        north: vector?.north ?? Number.NaN,
      })
      if (firstIndex < 0) {
        firstIndex = index - 1
        startSpeed = previousSpeed
      }
      lastIndex = index
      endSpeed = speed
    }

    const coverage = elapsed / settings.windowSeconds
    const directionalCoverage = distanceMeters > 0 ? directionalDistance / distanceMeters : 0
    const altitudeCoverage = elapsed > 0 ? altitudeElapsed / elapsed : 0
    if (
      firstIndex < 0 || lastIndex <= firstIndex || hasInteriorGap || coverage < MIN_DATA_COVERAGE ||
      directionalCoverage < MIN_DIRECTIONAL_COVERAGE || altitudeCoverage < MIN_ALTITUDE_COVERAGE
    ) continue

    const startAltitude = smoothedAltitudes[firstIndex]
    const endAltitude = smoothedAltitudes[lastIndex]
    if (startAltitude === null || endAltitude === null) continue
    const elevationChangeMeters = endAltitude - startAltitude
    const averageGrade = distanceMeters > 0 ? elevationChangeMeters / distanceMeters : 0
    const directionalDisplacement = Math.hypot(eastTotal, northTotal)
    const headingCoherence = directionalDistance > 0 ? directionalDisplacement / directionalDistance : 0
    if (
      distanceMeters < settings.windowSeconds * 3 || Math.abs(averageGrade) > settings.maxAbsoluteGrade || headingCoherence < 0.9
    ) continue

    const heading = (Math.atan2(eastTotal, northTotal) * 180) / Math.PI
    windows.push({
      index: windows.length + 1,
      startSeconds: windowStart,
      endSeconds: windowEnd,
      durationSeconds: elapsed,
      distanceMeters,
      elevationChangeMeters,
      averagePowerWatts: weightedPower / elapsed,
      averageSpeedMps: distanceMeters / elapsed,
      headingDegrees: (heading + 360) % 360,
      headingCoherence,
      directionalCoverage,
      altitudeCoverage,
      wheelEnergyJoules,
      kineticEnergyChangeJoules: 0.5 * totalMassKg * (endSpeed ** 2 - startSpeed ** 2),
      path,
    })
  }

  return windows
}

function aerodynamicEnergy(window: EnergyWindow, settings: AnalysisSettings, crr: number) {
  const mass = settings.riderMassKg + settings.bikeMassKg
  return window.wheelEnergyJoules - mass * GRAVITY * window.elevationChangeMeters -
    mass * GRAVITY * crr * window.distanceMeters - window.kineticEnergyChangeJoules
}

function airIntegral(window: EnergyWindow, windEastMps: number, windNorthMps: number) {
  let integral = 0
  for (const step of window.path) {
    if (!Number.isFinite(step.east) || !Number.isFinite(step.north)) return Number.NaN
    const tailwind = windEastMps * step.east + windNorthMps * step.north
    const crosswind = windEastMps * step.north - windNorthMps * step.east
    const forwardAirSpeed = step.speedMps - tailwind
    integral += Math.hypot(forwardAirSpeed, crosswind) * forwardAirSpeed * step.distanceMeters
  }
  return integral
}

function cdaForWindow(window: EnergyWindow, settings: AnalysisSettings, crr: number, east: number, north: number) {
  const integral = airIntegral(window, east, north)
  if (!Number.isFinite(integral) || integral <= 0) return Number.NaN
  return aerodynamicEnergy(window, settings, crr) / (0.5 * settings.airDensityKgM3 * integral)
}

function huber(value: number, transition = 1.5) {
  const magnitude = Math.abs(value)
  return magnitude <= transition ? 0.5 * magnitude ** 2 : transition * (magnitude - 0.5 * transition)
}

type FitCandidate = { cda: number; east: number; north: number; loss: number }

function jointLoss(windows: EnergyWindow[], settings: AnalysisSettings, crr: number, cda: number, east: number, north: number) {
  if (cda < 0.1 || cda > 0.7 || Math.hypot(east, north) > 12) return Number.POSITIVE_INFINITY
  let loss = 0
  for (const window of windows) {
    const estimate = cdaForWindow(window, settings, crr, east, north)
    if (!Number.isFinite(estimate)) return Number.POSITIVE_INFINITY
    loss += huber((estimate - cda) / 0.03)
  }
  let prior = (east ** 2 + north ** 2) * 0.002
  if (routeAxisCount(windows) < 2) {
    const heading = windows[0].headingDegrees * (Math.PI / 180)
    const unidentifiableCrosswind = east * Math.cos(heading) - north * Math.sin(heading)
    prior += unidentifiableCrosswind ** 2
  }
  return loss / windows.length + prior
}

function improveCandidate(windows: EnergyWindow[], settings: AnalysisSettings, crr: number, initial: FitCandidate) {
  let candidate = initial
  const stages = [
    { wind: 2, cda: 0.04 }, { wind: 1, cda: 0.02 }, { wind: 0.5, cda: 0.01 },
    { wind: 0.25, cda: 0.005 }, { wind: 0.1, cda: 0.002 }, { wind: 0.05, cda: 0.001 },
  ]
  for (const step of stages) {
    let improved = true
    while (improved) {
      improved = false
      const neighbors = [
        { cda: candidate.cda + step.cda, east: candidate.east, north: candidate.north },
        { cda: candidate.cda - step.cda, east: candidate.east, north: candidate.north },
        { cda: candidate.cda, east: candidate.east + step.wind, north: candidate.north },
        { cda: candidate.cda, east: candidate.east - step.wind, north: candidate.north },
        { cda: candidate.cda, east: candidate.east, north: candidate.north + step.wind },
        { cda: candidate.cda, east: candidate.east, north: candidate.north - step.wind },
      ]
      for (const neighbor of neighbors) {
        const loss = jointLoss(windows, settings, crr, neighbor.cda, neighbor.east, neighbor.north)
        if (loss + 1e-9 < candidate.loss) {
          candidate = { ...neighbor, loss }
          improved = true
        }
      }
    }
  }
  return candidate
}

function fitAtCrr(windows: EnergyWindow[], settings: AnalysisSettings, crr: number) {
  const starts = [
    { east: 0, north: 0 }, { east: 3, north: 0 }, { east: -3, north: 0 },
    { east: 0, north: 3 }, { east: 0, north: -3 },
  ]
  let best: FitCandidate | null = null
  for (const start of starts) {
    const seededCdas = windows.map((window) => cdaForWindow(window, settings, crr, start.east, start.north)).filter(Number.isFinite)
    const cda = clamp(median(seededCdas), 0.1, 0.7)
    const initial = { cda, ...start, loss: jointLoss(windows, settings, crr, cda, start.east, start.north) }
    const candidate = improveCandidate(windows, settings, crr, initial)
    if (best === null || candidate.loss < best.loss) best = candidate
  }
  if (best === null) return { wind: { east: 0, north: 0 }, cda: Number.NaN, raw: [], center: Number.NaN, threshold: Number.NaN, included: [] }

  const raw = windows.map((window) => cdaForWindow(window, settings, crr, best.east, best.north))
  const deviations = raw.filter(Number.isFinite).map((value) => Math.abs(value - best.cda))
  const threshold = Math.max(0.025, median(deviations) * 3.5)
  const included = raw.filter((value) => Number.isFinite(value) && value >= 0.1 && value <= 0.7 && Math.abs(value - best.cda) <= threshold)
  return { wind: best, cda: median(included), raw, center: best.cda, threshold, included }
}

function reciprocalSupport(windows: EnergyWindow[]) {
  let best = { forward: 0, reverse: 0 }
  for (const window of windows) {
    const forward = windows.filter((other) => angularDifference(other.headingDegrees, window.headingDegrees) <= 35).length
    const reverse = windows.filter((other) => angularDifference(other.headingDegrees, (window.headingDegrees + 180) % 360) <= 35).length
    if (Math.min(forward, reverse) > Math.min(best.forward, best.reverse)) best = { forward, reverse }
  }
  return best
}

export function analyzeCda(samples: RideSample[], settings: AnalysisSettings): CdaAnalysis {
  const windows = buildEnergyWindows(samples, settings)
  if (windows.length < 6) {
    throw new Error("Not enough complete, straight windows with reliable GPS and altitude data. Select a longer clean range.")
  }
  const reciprocal = reciprocalSupport(windows)
  if (reciprocal.forward < 2 || reciprocal.reverse < 2) {
    throw new Error("At least two clean windows in each of two opposite directions are required for wind estimation.")
  }

  const fit = fitAtCrr(windows, settings, settings.crr)
  if (!Number.isFinite(fit.cda) || fit.included.length < 3) {
    throw new Error("The selected data could not produce a plausible CdA estimate. Check mass, altitude, power, speed, and route consistency.")
  }

  const estimates = windows.map((window, index) => {
    const cda = fit.raw[index]
    return {
      ...window,
      cda,
      included: Number.isFinite(cda) && cda >= 0.1 && cda <= 0.7 && Math.abs(cda - fit.center) <= fit.threshold,
    }
  })
  const includedValues = estimates.filter((estimate) => estimate.included).map((estimate) => estimate.cda)
  const sensitivityCrrs = [...new Set([
    Math.max(0.001, settings.crr - 0.001), settings.crr, Math.min(0.015, settings.crr + 0.001),
  ])]
  const sensitivity = sensitivityCrrs.map((crr) => ({ crr, cda: fitAtCrr(windows, settings, crr).cda }))
  const windSpeed = Math.hypot(fit.wind.east, fit.wind.north)
  const windToward = (Math.atan2(fit.wind.east, fit.wind.north) * 180) / Math.PI
  const windFrom = (windToward + 540) % 360
  const speeds = windows.map((window) => window.averageSpeedMps)
  const speedRange = Math.max(...speeds) - Math.min(...speeds)
  const headingAxisCount = routeAxisCount(windows)
  const warnings: string[] = []
  if (includedValues.length < 8) warnings.push("Fewer than eight windows survived filtering; treat the estimate as provisional.")
  if (windSpeed > 8) warnings.push("The fitted wind is unusually high and may be absorbing position, drafting, or elevation errors.")
  if (speedRange < 1) warnings.push("The windows have little speed variation, so CdA and wind are weakly distinguishable.")
  if (headingAxisCount < 2) warnings.push("The route has only one reciprocal axis, so the unidentifiable crosswind component was constrained to zero.")

  return {
    cda: median(includedValues),
    cdaLow: percentile(includedValues, 0.25),
    cdaHigh: percentile(includedValues, 0.75),
    estimatedWindEastMps: fit.wind.east,
    estimatedWindNorthMps: fit.wind.north,
    estimatedWindSpeedMps: windSpeed,
    estimatedWindFromDegrees: windFrom,
    windows: estimates,
    includedWindowCount: includedValues.length,
    totalWindowCount: windows.length,
    sensitivity,
    warnings,
  }
}

export function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":")
}
