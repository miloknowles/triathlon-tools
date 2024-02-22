import { State, Params, Point, Data } from "./types";


/**
 * Constants that control the simulation.
 */
const G = 9.80665 // m/s2
const M = 0.0289644 // kg/mol, molar mass of Earth's air
const R = 8.3144598 // N·m/(mol·K), universal gas constant
const Rv = 461.495 // J/(kg K, specific gas constant of water vapor
const Rd = 287.05 // J/(kg K, specific gas constant of dry air
const Pb = 101325; // Pa
const zeroDegCelsiusInKelvin = 273.15;


/**
 * Get the index of points immediately before and after the current distance.
 * 
 * @param data The ordered list of `Point` objects
 * @param i The current index (speeds up the search)
 * @param x The current distance of the rider in the simulation (meters)
 * @returns [index before, index after]
 */
function getCurrentIndex(data: Point[], i: number, x: number): number[] {
  let _i = i;
  while (_i < data.length && data[_i].x < x) {
    ++_i;
  }

  const i2 = _i;

  if (i2 <= 1) {
    return [0, 1];
  } else if (i2 >= data.length) {
    return [data.length - 2, data.length - 1];
  }

  return [i2 - 1, i2];
}


/**
 * Interpolate a value at `x` from a list of `Point` objects.
 * 
 * @param data An input list of ordered `Point` objects
 * @param i0 The index of the point immediately before `x`
 * @param i1 The index of the point immediately after `x`
 * @param x The distance (meters) to interpolate values at
 * @param property The named property to interpolate (must be numeric)
 * @returns The interpolated value at `x`
 */
function interpolate(data: Point[], i0: number, i1: number, x: number, property: "y" | "a") {
  const x0 = data[i0].x;
  const x1 = data[i1].x;
  const alpha = Math.max(0, Math.min(1, (x - x0) / (x1 - x0))); // clamp 0-1
  const v0 = data[i0][property];
  const v1 = data[i1][property];
  return v0 * (1 - alpha) + v1 * (alpha)
}


/**
 * Returns the air density (rho) at a given altitude (y), temperature 
 * (Tk) and relative humidity (RH).
 * 
 * I had trouble finding a good source with an equation for humidity adjustment.
 * 
 * @param y the altitude in meters
 * @param Tk the temperature in Kelvin
 * @param RH should be between 0-1
 * @returns air density in kg/m^3
 */
function getRho(y: number, Tk: number, RH: number) {
  // Calculate the pressure of dry air at the given temperature and altitude.
  // See Density Equation 2: https://en.wikipedia.org/wiki/Barometric_formula
  const pressureAtY = Pb * Math.exp((-G * M * y)/(R*Tk));

  const Tc = Tk - zeroDegCelsiusInKelvin;

  // https://physics.stackexchange.com/questions/297273/how-to-calculate-air-density
  // https://en.wikipedia.org/wiki/Tetens_equation
  let Ps = 0;
  if (Tk < zeroDegCelsiusInKelvin) {
    Ps = 611 * Math.exp(21.875 * Tc / (Tc + 265.5)); // MPa
  } else {
    Ps = 611 * Math.exp(17.27 * Tc / (Tc + 237.3)); // MPa
  }

  const rho = 0.0034848 * (pressureAtY - 0.0037960 * RH * Ps) / Tk;

  return rho;
}


/**
 * Simulate a bike ride using the given parameters and course data.
 * 
 * Note that the simulation is a simple Euler integration of the forces acting
 * on the bike.
 * 
 * See: https://en.wikipedia.org/wiki/Euler_method
 * 
 * @param params the configuration of the simulation (e.g avgPowerWatts, avgCdA, etc.)
 * @returns an object with `results`, `errors`, and `meta` properties about the simulation.
 */
export async function simulate(params: Params) {
  const t0 = performance.now();
  const response = await fetch(params.url);
  const data: Data = await response.json();

  let errors = [];
  let results: State[] = [];

  let i = 0;
  let t = 0;
  let x_t = 0;
  let v_t = 0;

  // Use the exact distance of the course file, rather than the assumed race distance.
  const totalDist = data.data.at(-1)?.x || data.meta.totalDistanceMeters;
  const massTotalKg = params.massBikeKg + params.massRiderKg;

  let iter = 1;
  while (x_t < totalDist) {
    const P_legs = params.avgPowerWatts;
    const CdA = params.avgCdA;

    let F_dt = P_legs * (1 - 0.01*params.lossDrivetrain) / Math.max(v_t, 1);

    // Note that I is an array of two indices, the first being the index of the
    // point immediately before x_t, and the second being the index immediately after x_t.
    const I = getCurrentIndex(data.data, i, x_t);
    const alt = interpolate(data.data, I[0], I[1], x_t, "y");
    const theta = interpolate(data.data, I[0], I[1], x_t, "a");
    const rho = getRho(alt, params.ambientTempCelsius + zeroDegCelsiusInKelvin, params.relativeHumidity / 100);

    // We assume zero headwind always. This could be improved in future versions!
    const v_hw = 0;

    const F_drag = 0.5 * rho * CdA * (v_t + v_hw)**2;
    const F_grav = G * massTotalKg * Math.sin(theta);
    const F_roll = G * massTotalKg * params.avgCrr * Math.cos(theta);

    // Check if velocity will go zero or negative and override.
    let P_legs_override = 0;
    if (iter > 50 && F_dt < (F_drag + F_grav + F_roll + (massTotalKg * (params.velocityMin - v_t))/params.timestep)) {
      F_dt = (F_drag + F_grav + F_roll + (massTotalKg * (params.velocityMin - v_t))/params.timestep);
      P_legs_override = F_dt;
      errors.push("override_power");
    }

    const F_h = F_dt - F_drag - F_grav - F_roll;
    const a_h = F_h / massTotalKg;

    // Simulate the position and velocity at the next timestep.
    x_t = x_t + params.timestep * v_t;
    v_t = v_t + params.timestep * a_h;
    t = t + params.timestep;
    i = I[0];

    results.push({
      t,
      x: x_t,
      v: v_t, 
      alt,
      rho,
      F_drag,
      F_grav,
      F_roll,
    });

    ++iter;
  }

  const t1 = performance.now();
  const elapsed = (t1 - t0) / 1000;

  return {
    results,
    errors,
    meta: { ...data.meta, computeSec: elapsed, computeIters: iter }
  };
}
