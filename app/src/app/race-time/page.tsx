import type { Metadata } from "next"

import { Navbar } from "@/components/navbar"
import { RaceTimeCalculator } from "@/components/race-time-calculator"

export const metadata: Metadata = {
  title: "Race Calculator | Triathlon Tools",
  description: "Plan a triathlon finish time from swim, transition, bike, and run targets for standard or custom race distances.",
}

export default function RaceTimePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <RaceTimeCalculator />
    </div>
  )
}
