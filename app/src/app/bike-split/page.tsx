import type { Metadata } from "next"

import { BikeSimulator } from "@/components/bike-simulator"
import { Navbar } from "@/components/navbar"

export const metadata: Metadata = {
  title: "Bike Split Predictor | Triathlon Tools",
  description: "Predict your bike split from power, equipment, weather, and a real course elevation profile.",
}

export default function BikeSplitPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <BikeSimulator />
    </div>
  )
}
