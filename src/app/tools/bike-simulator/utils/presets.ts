// These are derived from power loss at 18mph and a rider weight of 42.5kg.
// See: https://www.bicyclerollingresistance.com/road-bike-reviews
export const presetsCRR = {
  // Poor road quality with puncture resistance tires
  bad: 0.00495,
  // New pavement with no modifier
  average: 0.00375,
  // New pavement with race tire
  good: 0.0035,
  // New pavement with race tire and latex tube
  excellent: 0.0033,
}

// From the Silca tool:
// <option value=".029">Track - 56/16</option>
// <option value=".0325">Track - 49/14</option>
// <option value=".047">New/Clean - 53/13</option>
// <option value=".055">New/Clean - 48/12</option>
// <option value=".01">Dirty Drive Train</option>
// <option value=".005">Dry Lube</option>
// <option value="-.0025">Silca Super Secret Chain Lube</option>
// <option value="-.01">Hot Melt Wax Lube</option>
export const presetsDtl = {
  bad: 6.5, // 48/12 gearing and dirty
  average: 4.7, // 53/13 gearing with Dry Lube
  good: 3.7, // 53/13 gearing with Hot Melt Wax
  excellent: 1.9, // Track 56/16 gearing with Hot Melt Wax
}

export const presetsCdA = {
  upright: 0.32,
  drops: 0.30,
  aero: 0.28,
  optimized: 0.23,
  pro: 0.20,
}