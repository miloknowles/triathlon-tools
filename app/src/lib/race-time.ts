export const METERS_PER_MILE = 1609.344
export const METERS_PER_YARD = 0.9144

export type RacePresetName = "Sprint" | "Olympic" | "Half" | "Full" | "Custom"
export type SwimDistanceUnit = "yd" | "m" | "mi"
export type BikeRunDistanceUnit = "km" | "mi"
export type SwimPaceUnit = "50yd" | "50m" | "100yd" | "100m"
export type BikeSpeedUnit = "km/h" | "mph"
export type RunPaceUnit = "min/km" | "min/mi"
export type InputSource = "time" | "pace"

export interface RacePreset {
  name: Exclude<RacePresetName, "Custom">
  swim: { distance: number; unit: SwimDistanceUnit }
  bike: { distance: number; unit: BikeRunDistanceUnit }
  run: { distance: number; unit: BikeRunDistanceUnit }
}

export interface DisciplineInputState<PaceUnit extends string> {
  distanceMeters: number | null
  durationSeconds: number | null
  paceOrSpeed: number | null
  paceUnit: PaceUnit
  source: InputSource | null
}

export interface RacePlanResult {
  swimSeconds: number | null
  t1Seconds: number
  bikeSeconds: number | null
  t2Seconds: number
  runSeconds: number | null
  totalSeconds: number | null
  missingDisciplines: Array<"swim" | "bike" | "run">
}

export const RACE_PRESETS: readonly RacePreset[] = [
  { name: "Sprint", swim: { distance: 750, unit: "m" }, bike: { distance: 20, unit: "km" }, run: { distance: 5, unit: "km" } },
  { name: "Olympic", swim: { distance: 1500, unit: "m" }, bike: { distance: 40, unit: "km" }, run: { distance: 10, unit: "km" } },
  { name: "Half", swim: { distance: 1.2, unit: "mi" }, bike: { distance: 56, unit: "mi" }, run: { distance: 13.1, unit: "mi" } },
  { name: "Full", swim: { distance: 2.4, unit: "mi" }, bike: { distance: 112, unit: "mi" }, run: { distance: 26.2, unit: "mi" } },
] as const

export function distanceToMeters(value: number, unit: SwimDistanceUnit | BikeRunDistanceUnit): number {
  if (!Number.isFinite(value)) return Number.NaN
  if (unit === "mi") return value * METERS_PER_MILE
  if (unit === "yd") return value * METERS_PER_YARD
  if (unit === "km") return value * 1000
  return value
}

export function metersToDistance(meters: number, unit: SwimDistanceUnit | BikeRunDistanceUnit): number {
  if (!Number.isFinite(meters)) return Number.NaN
  if (unit === "mi") return meters / METERS_PER_MILE
  if (unit === "yd") return meters / METERS_PER_YARD
  if (unit === "km") return meters / 1000
  return meters
}

export function swimPaceLengthMeters(unit: SwimPaceUnit): number {
  switch (unit) {
    case "50yd": return 50 * METERS_PER_YARD
    case "50m": return 50
    case "100yd": return 100 * METERS_PER_YARD
    case "100m": return 100
  }
}

export function swimPaceToSecondsPerMeter(seconds: number, unit: SwimPaceUnit): number {
  return seconds / swimPaceLengthMeters(unit)
}

export function secondsPerMeterToSwimPace(secondsPerMeter: number, unit: SwimPaceUnit): number {
  return secondsPerMeter * swimPaceLengthMeters(unit)
}

export function speedToMetersPerSecond(speed: number, unit: BikeSpeedUnit): number {
  return unit === "mph" ? speed * METERS_PER_MILE / 3600 : speed * 1000 / 3600
}

export function metersPerSecondToSpeed(metersPerSecond: number, unit: BikeSpeedUnit): number {
  return unit === "mph" ? metersPerSecond * 3600 / METERS_PER_MILE : metersPerSecond * 3.6
}

export function runPaceToSecondsPerMeter(seconds: number, unit: RunPaceUnit): number {
  return seconds / (unit === "min/mi" ? METERS_PER_MILE : 1000)
}

export function secondsPerMeterToRunPace(secondsPerMeter: number, unit: RunPaceUnit): number {
  return secondsPerMeter * (unit === "min/mi" ? METERS_PER_MILE : 1000)
}

export function durationFromPace(distanceMeters: number, secondsPerMeter: number): number | null {
  if (!(distanceMeters > 0) || !(secondsPerMeter > 0) || !Number.isFinite(distanceMeters) || !Number.isFinite(secondsPerMeter)) return null
  return Math.round(distanceMeters * secondsPerMeter)
}

export function durationFromSpeed(distanceMeters: number, metersPerSecond: number): number | null {
  if (!(distanceMeters > 0) || !(metersPerSecond > 0) || !Number.isFinite(distanceMeters) || !Number.isFinite(metersPerSecond)) return null
  return Math.round(distanceMeters / metersPerSecond)
}

export function parseDuration(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed || !/^\d+(?::\d+){0,2}$/.test(trimmed)) return null
  const parts = trimmed.split(":").map(Number)
  const seconds = parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts.length === 2 ? parts[0] * 60 + parts[1] : parts[0]
  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
}

export function formatDuration(seconds: number, alwaysHours = true): string {
  const rounded = Math.max(0, Math.round(seconds))
  const hours = Math.floor(rounded / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const remainder = rounded % 60
  if (!alwaysHours && hours === 0) return `${minutes}:${String(remainder).padStart(2, "0")}`
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
}

export function calculateRacePlan(
  swimSeconds: number | null,
  t1Seconds: number | null,
  bikeSeconds: number | null,
  t2Seconds: number | null,
  runSeconds: number | null,
): RacePlanResult {
  const valid = (value: number | null) => value !== null && Number.isFinite(value) && value > 0
  const missingDisciplines: RacePlanResult["missingDisciplines"] = []
  if (!valid(swimSeconds)) missingDisciplines.push("swim")
  if (!valid(bikeSeconds)) missingDisciplines.push("bike")
  if (!valid(runSeconds)) missingDisciplines.push("run")
  const t1 = t1Seconds !== null && Number.isFinite(t1Seconds) && t1Seconds >= 0 ? Math.round(t1Seconds) : 0
  const t2 = t2Seconds !== null && Number.isFinite(t2Seconds) && t2Seconds >= 0 ? Math.round(t2Seconds) : 0
  return {
    swimSeconds: valid(swimSeconds) ? Math.round(swimSeconds!) : null,
    t1Seconds: t1,
    bikeSeconds: valid(bikeSeconds) ? Math.round(bikeSeconds!) : null,
    t2Seconds: t2,
    runSeconds: valid(runSeconds) ? Math.round(runSeconds!) : null,
    totalSeconds: missingDisciplines.length === 0
      ? Math.round(swimSeconds! + t1 + bikeSeconds! + t2 + runSeconds!)
      : null,
    missingDisciplines,
  }
}
