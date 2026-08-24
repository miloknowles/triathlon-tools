import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RideSample } from "@/lib/cda-analysis"
import type { ImportedRide } from "@/lib/fit-import"
import { CdaAnalyzer } from "@/components/cda-analyzer"

const parseFitFile = vi.fn()

vi.mock("@/lib/fit-import", () => ({
  MAX_FIT_BYTES: 50 * 1024 * 1024,
  parseFitFile: (...args: unknown[]) => parseFitFile(...args),
}))

vi.mock("@/components/ride-map", () => ({
  RideMap: ({ hoverSample }: { hoverSample: RideSample | null }) => (
    <div data-testid="ride-map">{hoverSample ? `marker-${hoverSample.elapsedSeconds}` : "no-marker"}</div>
  ),
}))

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => <>{children}</>,
  LineChart: ({ children, onMouseMove, onMouseLeave, onTouchMove, onTouchEnd }: {
    children: ReactNode
    onMouseMove: (state: { activeTooltipIndex: number }) => void
    onMouseLeave: () => void
    onTouchMove: (state: { activeTooltipIndex: number }) => void
    onTouchEnd: () => void
  }) => (
    <div data-testid="overview-chart" onMouseMove={() => onMouseMove({ activeTooltipIndex: 2 })} onMouseLeave={onMouseLeave}>
      <button type="button" onTouchMove={() => onTouchMove({ activeTooltipIndex: 2 })} onTouchEnd={onTouchEnd}>Touch chart</button>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  Legend: () => null,
  Line: () => null,
  ReferenceArea: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}))

function ride(hasGps = true): ImportedRide {
  const samples = [0, 10, 20].map((elapsedSeconds): RideSample => ({
    elapsedSeconds,
    timestamp: new Date(elapsedSeconds * 1000),
    powerWatts: 200,
    speedMps: 10,
    distanceMeters: elapsedSeconds * 10,
    altitudeMeters: 20,
    latitudeDegrees: hasGps ? 42 + elapsedSeconds / 1000 : null,
    longitudeDegrees: hasGps ? -71 + elapsedSeconds / 1000 : null,
  }))
  return {
    filename: "ride.fit",
    samples,
    durationSeconds: 20,
    distanceMeters: 200,
    averagePowerWatts: 200,
    hasGps,
    hasAltitude: true,
  }
}

async function upload(importedRide: ImportedRide) {
  parseFitFile.mockResolvedValueOnce(importedRide)
  fireEvent.change(screen.getByLabelText("Import FIT file"), {
    target: { files: [new File(["fit"], "ride.fit")] },
  })
  await screen.findByText("ride.fit")
}

beforeEach(() => {
  parseFitFile.mockReset()
})

describe("CdaAnalyzer ride map", () => {
  it("moves the map marker with chart mouse and touch activity, then clears it on exit", async () => {
    render(<CdaAnalyzer />)
    await upload(ride())

    expect(screen.getByTestId("ride-map").textContent).toBe("no-marker")
    fireEvent.mouseMove(screen.getByTestId("overview-chart"))
    expect(screen.getByTestId("ride-map").textContent).toBe("marker-20")
    fireEvent.mouseLeave(screen.getByTestId("overview-chart"))
    expect(screen.getByTestId("ride-map").textContent).toBe("no-marker")

    fireEvent.touchMove(screen.getByRole("button", { name: "Touch chart" }))
    expect(screen.getByTestId("ride-map").textContent).toBe("marker-20")
    fireEvent.touchEnd(screen.getByRole("button", { name: "Touch chart" }))
    expect(screen.getByTestId("ride-map").textContent).toBe("no-marker")
  })

  it("omits the map and keeps the GPS warning when no usable coordinates exist", async () => {
    render(<CdaAnalyzer />)
    await upload(ride(false))

    await waitFor(() => expect(screen.queryByTestId("ride-map")).toBeNull())
    expect(screen.getByText("GPS headings are missing; wind fitting will be limited.")).toBeDefined()
  })
})
