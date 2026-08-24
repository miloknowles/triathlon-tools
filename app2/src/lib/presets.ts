export const PRESETS = {
  crr: [
    { label: "Everyday", value: 0.00495 },
    { label: "Race", value: 0.00375 },
    { label: "Fast", value: 0.0033 },
  ],
  drivetrain: [
    { label: "Average", value: 4.7 },
    { label: "Waxed", value: 3.7 },
    { label: "Optimized", value: 1.9 },
  ],
  cda: [
    { label: "Hoods", value: 0.32 },
    { label: "Aero", value: 0.28 },
    { label: "Optimized", value: 0.23 },
    { label: "Pro", value: 0.2 },
  ],
  racePosition: [
    { label: "Typical 95%", value: 95 },
    { label: "Dialed 99%", value: 99 },
    { label: "Perfect 100%", value: 100 },
  ],
} as const
