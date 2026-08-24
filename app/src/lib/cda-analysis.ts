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
  wheelEnergyJoules: number
  kineticEnergyChangeJoules: number
  path: Array<{
    distanceMeters: number
    speedMps: number
    east: number
    north: number
  }>
}

export type WindowEstimate = EnergyWindow & {
  cda: number
  included: boolean
}

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
    previous.latitudeDegrees === null ||
    previous.longitudeDegrees === null ||
    current.latitudeDegrees === null ||
    current.longitudeDegrees === null
  ) {
    return { distanceMeters: fallbackDistance, east: 0, north: 0 }
  }

  const latitude = ((previous.latitudeDegrees + current.latitudeDegrees) / 2) * (Math.PI / 180)
  const north = (current.latitudeDegrees - previous.latitudeDegrees) * (Math.PI / 180) * EARTH_RADIUS_METERS
  const east =
    (current.longitudeDegrees - previous.longitudeDegrees) *
    (Math.PI / 180) *
    EARTH_RADIUS_METERS *
    Math.cos(latitude)
  const distanceMeters = Math.hypot(east, north)
  if (distanceMeters < 0.2 || distanceMeters > Math.max(100, fallbackDistance * 3)) {
    return { distanceMeters: fallbackDistance, east: 0, north: 0 }
  }
  return { distanceMeters, east: east / distanceMeters, north: north / distanceMeters }
}

export function buildEnergyWindows(samples: RideSample[], settings: AnalysisSettings): EnergyWindow[] {
  if (samples.length < 2) return []
  const smoothedAltitudes = smoothNullable(
    samples.map((sample) => sample.altitudeMeters),
    7
  )
  const totalMassKg = settings.riderMassKg + settings.bikeMassKg
  const firstWindow = Math.floor(settings.startSeconds / settings.windowSeconds) * settings.windowSeconds
  const windows: EnergyWindow[] = []

  for (let windowStart = firstWindow; windowStart < settings.endSeconds; windowStart += settings.windowSeconds) {
    const windowEnd = Math.min(windowStart + settings.windowSeconds, settings.endSeconds)
    if (windowEnd - Math.max(windowStart, settings.startSeconds) < settings.windowSeconds * 0.8) continue

    let wheelEnergyJoules = 0
    let distanceMeters = 0
    let weightedPower = 0
    let elapsed = 0
    let eastTotal = 0
    let northTotal = 0
    let directionalDistance = 0
    const path: EnergyWindow["path"] = []
    let firstIndex = -1
    let lastIndex = -1
    let invalidSeconds = 0

    for (let index = 1; index < samples.length; index += 1) {
      const current = samples[index]
      const previous = samples[index - 1]
      if (current.elapsedSeconds <= windowStart || current.elapsedSeconds > windowEnd) continue
      const dt = current.elapsedSeconds - previous.elapsedSeconds
      if (dt <= 0 || dt > 3) {
        invalidSeconds += Math.max(1, dt)
        continue
      }
      const speed = current.speedMps ?? previous.speedMps
      const power = current.powerWatts ?? previous.powerWatts
      if (speed === null || power === null || speed < 3 || power < 20) {
        invalidSeconds += dt
        continue
      }

      const previousSpeed = previous.speedMps ?? speed
      const fallbackDistance = ((speed + previousSpeed) / 2) * dt
      const recordedDistance =
        current.distanceMeters !== null && previous.distanceMeters !== null
          ? current.distanceMeters - previous.distanceMeters
          : Number.NaN
      const stepDistance =
        Number.isFinite(recordedDistance) && recordedDistance > 0 && recordedDistance < fallbackDistance * 3
          ? recordedDistance
          : fallbackDistance
      const vector = pathVector(previous, current, stepDistance)
      const hasDirection = vector.east !== 0 || vector.north !== 0

      wheelEnergyJoules += power * settings.drivetrainEfficiency * dt
      weightedPower += power * dt
      elapsed += dt
      distanceMeters += stepDistance
      if (hasDirection) {
        eastTotal += vector.east * stepDistance
        northTotal += vector.north * stepDistance
        directionalDistance += stepDistance
      }
      path.push({
        distanceMeters: stepDistance,
        speedMps: (speed + previousSpeed) / 2,
        east: vector.east,
        north: vector.north,
      })
      if (firstIndex < 0) firstIndex = index - 1
      lastIndex = index
    }

    if (firstIndex < 0 || lastIndex <= firstIndex || elapsed < settings.windowSeconds * 0.75 || invalidSeconds > settings.windowSeconds * 0.2) {
      continue
    }

    const startAltitude = smoothedAltitudes[firstIndex]
    const endAltitude = smoothedAltitudes[lastIndex]
    const elevationChangeMeters = startAltitude !== null && endAltitude !== null ? endAltitude - startAltitude : 0
    const averageGrade = distanceMeters > 0 ? elevationChangeMeters / distanceMeters : 0
    const firstSpeed = samples[firstIndex].speedMps ?? 0
    const lastSpeed = samples[lastIndex].speedMps ?? firstSpeed
    const directionalDisplacement = Math.hypot(eastTotal, northTotal)
    const headingCoherence = directionalDistance > 0 ? directionalDisplacement / directionalDistance : 0
    if (
      distanceMeters < settings.windowSeconds * 3 ||
      Math.abs(averageGrade) > settings.maxAbsoluteGrade ||
      headingCoherence < 0.9
    ) {
      continue
    }

    windows.push({
      index: windows.length + 1,
      startSeconds: Math.max(windowStart, settings.startSeconds),
      endSeconds: windowEnd,
      durationSeconds: elapsed,
      distanceMeters,
      elevationChangeMeters,
      averagePowerWatts: weightedPower / elapsed,
      averageSpeedMps: distanceMeters / elapsed,
      headingDegrees: (Math.atan2(eastTotal, northTotal) * 180) / Math.PI < 0
        ? (Math.atan2(eastTotal, northTotal) * 180) / Math.PI + 360
        : (Math.atan2(eastTotal, northTotal) * 180) / Math.PI,
      headingCoherence,
      wheelEnergyJoules,
      kineticEnergyChangeJoules: 0.5 * totalMassKg * (lastSpeed ** 2 - firstSpeed ** 2),
      path,
    })
  }

  return windows
}

function cdaForWindow(
  window: EnergyWindow,
  settings: AnalysisSettings,
  crr: number,
  windEastMps: number,
  windNorthMps: number
) {
  const mass = settings.riderMassKg + settings.bikeMassKg
  const gravityEnergy = mass * GRAVITY * window.elevationChangeMeters
  const rollingEnergy = mass * GRAVITY * crr * window.distanceMeters
  const aerodynamicEnergy =
    window.wheelEnergyJoules - gravityEnergy - rollingEnergy - window.kineticEnergyChangeJoules
  let airIntegral = 0
  for (const step of window.path) {
    const tailwind = windEastMps * step.east + windNorthMps * step.north
    const crosswind = windEastMps * step.north - windNorthMps * step.east
    const forwardAirSpeed = step.speedMps - tailwind
    const relativeAirSpeed = Math.hypot(forwardAirSpeed, crosswind)
    airIntegral += relativeAirSpeed * forwardAirSpeed * step.distanceMeters
  }
  return aerodynamicEnergy / (0.5 * settings.airDensityKgM3 * airIntegral)
}

function windLoss(windows: EnergyWindow[], settings: AnalysisSettings, crr: number, east: number, north: number) {
  const values = windows
    .map((window) => cdaForWindow(window, settings, crr, east, north))
    .filter((value) => Number.isFinite(value) && value > 0.08 && value < 0.8)
  if (values.length < Math.max(3, windows.length * 0.5)) return Number.POSITIVE_INFINITY
  const center = median(values)
  return median(values.map((value) => Math.min(((value - center) / 0.05) ** 2, 9))) + (east ** 2 + north ** 2) * 0.00003
}

function estimateWind(windows: EnergyWindow[], settings: AnalysisSettings, crr: number) {
  let best = { east: 0, north: 0, loss: windLoss(windows, settings, crr, 0, 0) }
  for (const start of [
    { east: 0, north: 0 },
    { east: 3, north: 0 },
    { east: -3, north: 0 },
    { east: 0, north: 3 },
    { east: 0, north: -3 },
  ]) {
    let candidate = { ...start, loss: windLoss(windows, settings, crr, start.east, start.north) }
    for (const step of [2, 1, 0.5, 0.25, 0.1]) {
      let improved = true
      while (improved) {
        improved = false
        for (const [deltaEast, deltaNorth] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
          const east = candidate.east + deltaEast
          const north = candidate.north + deltaNorth
          if (Math.hypot(east, north) > 12) continue
          const loss = windLoss(windows, settings, crr, east, north)
          if (loss + 1e-9 < candidate.loss) {
            candidate = { east, north, loss }
            improved = true
          }
        }
      }
    }
    if (candidate.loss < best.loss) best = candidate
  }
  return best
}

function fitAtCrr(windows: EnergyWindow[], settings: AnalysisSettings, crr: number) {
  const wind = estimateWind(windows, settings, crr)
  const raw = windows.map((window) => cdaForWindow(window, settings, crr, wind.east, wind.north))
  const plausible = raw.filter((value) => Number.isFinite(value) && value >= 0.1 && value <= 0.7)
  const center = median(plausible)
  const mad = median(plausible.map((value) => Math.abs(value - center)))
  const threshold = Math.max(0.025, mad * 3.5)
  const included = raw.filter((value) => Number.isFinite(value) && value >= 0.1 && value <= 0.7 && Math.abs(value - center) <= threshold)
  return { wind, cda: median(included), raw, center, threshold, included }
}

export function analyzeCda(samples: RideSample[], settings: AnalysisSettings): CdaAnalysis {
  const windows = buildEnergyWindows(samples, settings)
  if (windows.length < 3) throw new Error("Not enough clean, straight windows in this range. Try a longer range, a shorter window, or a higher grade limit.")

  const fit = fitAtCrr(windows, settings, settings.crr)
  if (!Number.isFinite(fit.cda)) throw new Error("The selected data could not produce a plausible CdA estimate. Check mass, altitude, power, and speed data.")

  const estimates = windows.map((window, index) => {
    const cda = fit.raw[index]
    return {
      ...window,
      cda,
      included: Number.isFinite(cda) && cda >= 0.1 && cda <= 0.7 && Math.abs(cda - fit.center) <= fit.threshold,
    }
  })
  const includedValues = estimates.filter((estimate) => estimate.included).map((estimate) => estimate.cda)
  const sensitivityCrrs = [Math.max(0.0015, settings.crr - 0.001), settings.crr, Math.min(0.008, settings.crr + 0.001)]
  const sensitivity = sensitivityCrrs.map((crr) => ({ crr, cda: fitAtCrr(windows, settings, crr).cda }))
  const windSpeed = Math.hypot(fit.wind.east, fit.wind.north)
  const windToward = (Math.atan2(fit.wind.east, fit.wind.north) * 180) / Math.PI
  const windFrom = (windToward + 180 + 360) % 360
  const headings = windows.map((window) => window.headingDegrees)
  const hasOppositeDirections = headings.some((heading, index) =>
    headings.some((other, otherIndex) => index !== otherIndex && Math.abs((((heading - other + 540) % 360) - 180)) > 140)
  )
  const warnings: string[] = []
  if (!hasOppositeDirections) warnings.push("No strong opposite-direction pair was detected, so the wind estimate is weak.")
  if (includedValues.length < 6) warnings.push("Fewer than six windows survived filtering; treat the interval as provisional.")
  if (windSpeed > 8) warnings.push("The fitted wind is unusually high and may be absorbing position, drafting, or elevation errors.")

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
