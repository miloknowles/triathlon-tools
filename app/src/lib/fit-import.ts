import FitParser from "fit-file-parser"

import type { RideSample } from "@/lib/cda-analysis"

export const MAX_FIT_BYTES = 50 * 1024 * 1024

type FitRecord = {
  timestamp?: Date
  power?: number
  speed?: number
  enhanced_speed?: number
  distance?: number
  altitude?: number
  enhanced_altitude?: number
  position_lat?: number
  position_long?: number
}

export type ImportedRide = {
  filename: string
  samples: RideSample[]
  durationSeconds: number
  distanceMeters: number
  averagePowerWatts: number
  hasGps: boolean
  hasAltitude: boolean
}

export async function parseFitFile(file: File): Promise<ImportedRide> {
  if (!file.name.toLowerCase().endsWith(".fit")) throw new Error("Choose a .fit activity file.")
  if (file.size > MAX_FIT_BYTES) throw new Error("That FIT file is larger than 50 MB.")

  const parser = new FitParser({ mode: "list", speedUnit: "m/s", lengthUnit: "m", force: false })
  let parsed: { records?: FitRecord[] }
  try {
    parsed = await parser.parseAsync(await file.arrayBuffer())
  } catch (error) {
    throw new Error(typeof error === "string" ? error : "The FIT file could not be decoded.")
  }

  const records = parsed.records ?? []
  const firstTimestamp = records.find((record) => record.timestamp instanceof Date)?.timestamp
  if (!firstTimestamp) throw new Error("The FIT file does not contain timestamped ride records.")
  const firstTime = firstTimestamp.getTime()
  const samples: RideSample[] = records
    .filter((record) => record.timestamp instanceof Date)
    .map((record) => ({
      timestamp: record.timestamp as Date,
      elapsedSeconds: ((record.timestamp as Date).getTime() - firstTime) / 1000,
      powerWatts: Number.isFinite(record.power) ? record.power as number : null,
      speedMps: Number.isFinite(record.enhanced_speed ?? record.speed) ? (record.enhanced_speed ?? record.speed) as number : null,
      distanceMeters: Number.isFinite(record.distance) ? record.distance as number : null,
      altitudeMeters: Number.isFinite(record.enhanced_altitude ?? record.altitude)
        ? (record.enhanced_altitude ?? record.altitude) as number
        : null,
      // fit-file-parser converts fields declared in FIT semicircles to degrees.
      latitudeDegrees: Number.isFinite(record.position_lat) ? record.position_lat as number : null,
      longitudeDegrees: Number.isFinite(record.position_long) ? record.position_long as number : null,
    }))
    .filter((sample) => sample.elapsedSeconds >= 0)

  if (samples.length < 30) throw new Error("The FIT file contains too few ride records to analyze.")
  const samplesWithPower = samples.filter((sample) => sample.powerWatts !== null)
  const samplesWithSpeed = samples.filter((sample) => sample.speedMps !== null)
  if (samplesWithPower.length < 30) throw new Error("The FIT file does not contain enough power data.")
  if (samplesWithSpeed.length < 30) throw new Error("The FIT file does not contain enough speed data.")

  const durationSeconds = samples.at(-1)?.elapsedSeconds ?? 0
  const recordedDistances = samples.map((sample) => sample.distanceMeters).filter((value): value is number => value !== null)
  const distanceMeters = recordedDistances.length > 1
    ? recordedDistances.at(-1)! - recordedDistances[0]
    : samplesWithSpeed.reduce((total, sample, index) => {
        if (index === 0) return total
        return total + (sample.speedMps ?? 0) * (sample.elapsedSeconds - samplesWithSpeed[index - 1].elapsedSeconds)
      }, 0)
  const averagePowerWatts = samplesWithPower.reduce((total, sample) => total + (sample.powerWatts ?? 0), 0) / samplesWithPower.length

  return {
    filename: file.name,
    samples,
    durationSeconds,
    distanceMeters,
    averagePowerWatts,
    hasGps: samples.some((sample) => sample.latitudeDegrees !== null && sample.longitudeDegrees !== null),
    hasAltitude: samples.some((sample) => sample.altitudeMeters !== null),
  }
}
