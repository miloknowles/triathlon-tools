export const PRESETS = {
  crr: [
    { label: "Race tire / smooth road", value: 0.0025 },
    { label: "Race tire / typical road", value: 0.0035 },
    { label: "Durable tire / typical road", value: 0.005 },
    { label: "Rough pavement", value: 0.0065 },
  ],
  drivetrain: [
    { label: "Wheel-measured power", value: 0 },
    { label: "Race-prepped", value: 2 },
    { label: "Clean and lubricated", value: 2.5 },
    { label: "Dirty or wet", value: 5 },
  ],
  cda: [
    { label: "Road — hoods", value: 0.34 },
    { label: "Road — aero", value: 0.3 },
    { label: "Tri — aerobars", value: 0.27 },
    { label: "Tri — optimized", value: 0.23 },
  ],
  racePosition: [
    { label: "Typical 95%", value: 95 },
    { label: "Dialed 99%", value: 99 },
    { label: "Perfect 100%", value: 100 },
  ],
} as const
