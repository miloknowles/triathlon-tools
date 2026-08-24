export type SimulatorParams = {
  avgPowerWatts: number
  avgCdA: number
  racePositionPercent: number
  avgCrr: number
  lossDrivetrain: number
  massBikeKg: number
  massRiderKg: number
  ambientTempCelsius: number
  relativeHumidity: number
  velocityMin?: number
  timestep?: number
}

export type CoursePoint = { x: number; y: number; a: number }

export type CourseData = {
  data: CoursePoint[]
  meta: { totalDistanceMeters: number; totalGainMeters: number }
}

export type SimulationState = {
  t: number
  x: number
  v: number
  alt: number
  dragWatts: number
  rollingWatts: number
  gravityWatts: number
}

export type SimulationResult = {
  states: SimulationState[]
  totalDistanceMeters: number
  totalGainMeters: number
  overrideCount: number
}

const G = 9.80665
const MOLAR_MASS_AIR = 0.0289644
const GAS_CONSTANT = 8.3144598
const SEA_LEVEL_PRESSURE = 101325
const CELSIUS_TO_KELVIN = 273.15
const OUT_OF_POSITION_CDA_MULTIPLIER = 1.25

function currentIndices(data: CoursePoint[], start: number, distance: number) {
  let index = start
  while (index < data.length && data[index].x < distance) index += 1
  if (index <= 1) return [0, 1] as const
  if (index >= data.length) return [data.length - 2, data.length - 1] as const
  return [index - 1, index] as const
}

function interpolate(
  data: CoursePoint[],
  before: number,
  after: number,
  distance: number,
  property: "y" | "a"
) {
  const span = data[after].x - data[before].x
  const alpha = span === 0 ? 0 : Math.max(0, Math.min(1, (distance - data[before].x) / span))
  return data[before][property] * (1 - alpha) + data[after][property] * alpha
}

function airDensity(altitude: number, temperatureCelsius: number, humidityPercent: number) {
  const temperatureKelvin = temperatureCelsius + CELSIUS_TO_KELVIN
  const pressure = SEA_LEVEL_PRESSURE * Math.exp(
    (-G * MOLAR_MASS_AIR * altitude) / (GAS_CONSTANT * temperatureKelvin)
  )
  const saturationPressure = temperatureCelsius < 0
    ? 611 * Math.exp((21.875 * temperatureCelsius) / (temperatureCelsius + 265.5))
    : 611 * Math.exp((17.27 * temperatureCelsius) / (temperatureCelsius + 237.3))

  return 0.0034848 * (pressure - 0.003796 * (humidityPercent / 100) * saturationPressure) / temperatureKelvin
}

export async function loadCourse(url: string): Promise<CourseData> {
  const response = await fetch(url)
  if (!response.ok) throw new Error("The selected course could not be loaded.")

  const course = (await response.json()) as CourseData
  if (!Array.isArray(course.data) || course.data.length < 2) {
    throw new Error("The selected course does not contain enough data.")
  }
  return course
}

export function simulate(course: CourseData, params: SimulatorParams): SimulationResult {
  if (course.data.length < 2) throw new Error("The selected course does not contain enough data.")
  if (!Number.isFinite(params.racePositionPercent) || params.racePositionPercent < 0 || params.racePositionPercent > 100) {
    throw new Error("Time in race position must be between 0% and 100%.")
  }

  const timestep = params.timestep ?? 0.2
  const velocityMin = params.velocityMin ?? 1
  const racePositionFraction = params.racePositionPercent / 100
  const effectiveCdA = params.avgCdA * (
    racePositionFraction + OUT_OF_POSITION_CDA_MULTIPLIER * (1 - racePositionFraction)
  )
  const totalDistanceMeters = course.data.at(-1)?.x ?? course.meta.totalDistanceMeters
  const totalMassKg = params.massBikeKg + params.massRiderKg
  const states: SimulationState[] = []

  let dataIndex = 0
  let time = 0
  let distance = 0
  let velocity = 0
  let iteration = 1
  let overrideCount = 0

  while (distance < totalDistanceMeters) {
    if (iteration > 2_000_000) throw new Error("The simulation did not converge.")

    const [before, after] = currentIndices(course.data, dataIndex, distance)
    const altitude = interpolate(course.data, before, after, distance, "y")
    const angle = interpolate(course.data, before, after, distance, "a")
    const rho = airDensity(altitude, params.ambientTempCelsius, params.relativeHumidity)

    let driveForce = params.avgPowerWatts * (1 - params.lossDrivetrain / 100) / Math.max(velocity, 1)
    const dragForce = 0.5 * rho * effectiveCdA * velocity ** 2
    const gravityForce = G * totalMassKg * Math.sin(angle)
    const rollingForce = G * totalMassKg * params.avgCrr * Math.cos(angle)
    const minimumForce = dragForce + gravityForce + rollingForce + totalMassKg * (velocityMin - velocity) / timestep

    if (iteration > 50 && driveForce < minimumForce) {
      driveForce = minimumForce
      overrideCount += 1
    }

    const acceleration = (driveForce - dragForce - gravityForce - rollingForce) / totalMassKg
    distance += timestep * velocity
    velocity += timestep * acceleration
    time += timestep
    dataIndex = before

    states.push({
      t: time,
      x: distance,
      v: velocity,
      alt: altitude,
      dragWatts: velocity * dragForce,
      rollingWatts: velocity * rollingForce,
      gravityWatts: velocity * gravityForce,
    })
    iteration += 1
  }

  return {
    states,
    totalDistanceMeters,
    totalGainMeters: course.meta.totalGainMeters,
    overrideCount,
  }
}
