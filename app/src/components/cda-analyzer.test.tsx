import type { ReactNode } from "react"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
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
  LineChart: ({ children, onMouseDown, onMouseMove, onMouseUp, onMouseLeave, onTouchStart, onTouchMove, onTouchEnd }: {
    children: ReactNode
    onMouseDown: (state: { activeTooltipIndex: number }) => void
    onMouseMove: (state: { activeTooltipIndex: number }) => void
    onMouseUp: (state: { activeTooltipIndex: number }) => void
    onMouseLeave: () => void
    onTouchStart: (state: { activeTooltipIndex: number }) => void
    onTouchMove: (state: { activeTooltipIndex: number }) => void
    onTouchEnd: (state: { activeTooltipIndex: number }) => void
  }) => (
    <div
      data-testid="overview-chart"
      onMouseDown={(event) => onMouseDown({ activeTooltipIndex: event.shiftKey ? 2 : 0 })}
      onMouseMove={(event) => onMouseMove({ activeTooltipIndex: event.ctrlKey ? 0 : 2 })}
      onMouseUp={(event) => onMouseUp({ activeTooltipIndex: event.ctrlKey ? 0 : 2 })}
      onMouseLeave={onMouseLeave}
    >
      <button
        type="button"
        onTouchStart={() => onTouchStart({ activeTooltipIndex: 0 })}
        onTouchMove={() => onTouchMove({ activeTooltipIndex: 2 })}
        onTouchEnd={() => onTouchEnd({ activeTooltipIndex: 2 })}
      >Touch chart</button>
      {children}
    </div>
  ),
  CartesianGrid: () => null,
  Legend: () => null,
  Line: () => null,
  ReferenceArea: ({ x1, x2, yAxisId }: { x1: number; x2: number; yAxisId: string }) => <output data-testid="selection-area" data-x1={x1} data-x2={x2} data-y-axis-id={yAxisId} />,
  ReferenceLine: () => null,
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
  vi.useRealTimers()
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
    expect(screen.getByText("GPS headings are required for CdA analysis.")).toBeDefined()
    expect(screen.getByRole("button", { name: "Estimate CdA" }).hasAttribute("disabled")).toBe(true)
  })

  it("commits ordered start and end times when dragging in either direction", async () => {
    render(<CdaAnalyzer />)
    await upload(ride())
    const chart = screen.getByTestId("overview-chart")
    const startInput = screen.getByLabelText("Start time") as HTMLInputElement
    const endInput = screen.getByLabelText("End time") as HTMLInputElement

    fireEvent.mouseDown(chart)
    fireEvent.mouseMove(chart)
    expect(screen.getByTestId("selection-area").getAttribute("data-x2")).toBe(String(20 / 60))
    expect(screen.getByTestId("selection-area").getAttribute("data-y-axis-id")).toBe("power")
    fireEvent.mouseUp(chart)
    expect(startInput.value).toBe("00:00")
    expect(endInput.value).toBe("00:20")

    fireEvent.mouseDown(chart, { shiftKey: true })
    fireEvent.mouseMove(chart, { ctrlKey: true })
    fireEvent.mouseUp(chart, { ctrlKey: true })
    expect(startInput.value).toBe("00:00")
    expect(endInput.value).toBe("00:20")
  })

  it("allows the window length to be cleared before entering a replacement value", async () => {
    render(<CdaAnalyzer />)
    await upload(ride())
    const input = screen.getByLabelText("Window length") as HTMLInputElement

    expect(input.min).toBe("15")
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "" } })
    expect(input.value).toBe("")
    fireEvent.change(input, { target: { value: "90" } })
    expect(input.value).toBe("90")
    fireEvent.blur(input)
    expect(input.value).toBe("90")
  })

  it("does not commit an out-of-range numeric setting", async () => {
    render(<CdaAnalyzer />)
    await upload(ride())
    const input = screen.getByLabelText("Window length") as HTMLInputElement

    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "-60" } })
    expect(input.value).toBe("-60")
    fireEvent.blur(input)
    expect(input.value).toBe("60")
  })

  it("edits start and end times as MM:SS values", async () => {
    render(<CdaAnalyzer />)
    await upload(ride())
    const startInput = screen.getByLabelText("Start time") as HTMLInputElement
    const endInput = screen.getByLabelText("End time") as HTMLInputElement

    expect(startInput.value).toBe("00:00")
    expect(endInput.value).toBe("00:20")
    fireEvent.focus(startInput)
    fireEvent.change(startInput, { target: { value: "0:05" } })
    fireEvent.blur(startInput)
    expect(startInput.value).toBe("00:05")
    fireEvent.focus(endInput)
    fireEvent.change(endInput, { target: { value: "00:75" } })
    fireEvent.blur(endInput)
    expect(endInput.value).toBe("00:20")
  })

  it("shows a spinner and keeps analysis pending for at least one second", async () => {
    render(<CdaAnalyzer />)
    await upload(ride())
    vi.useFakeTimers()
    const button = screen.getByRole("button", { name: "Estimate CdA" }) as HTMLButtonElement

    fireEvent.click(button)
    expect((screen.getByRole("button", { name: "Estimating CdA…" }) as HTMLButtonElement).disabled).toBe(true)
    await act(async () => { await vi.advanceTimersByTimeAsync(999) })
    expect(screen.getByRole("button", { name: "Estimating CdA…" })).toBeDefined()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(screen.getByRole("button", { name: "Estimate CdA" })).toBeDefined()
    const assumptionsHeading = screen.getByText("Set the analysis assumptions")
    const errorHeading = screen.getByText("Analysis unavailable")
    expect(assumptionsHeading.compareDocumentPosition(errorHeading) & Node.DOCUMENT_POSITION_FOLLOWING).not.toBe(0)
  })
})
