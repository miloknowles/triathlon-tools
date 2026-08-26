import type { ReactNode } from "react"
import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RideSample } from "@/lib/cda-analysis"
import { gpsSamples } from "@/lib/ride-map"
import { RideMap } from "@/components/ride-map"

const mapCalls = vi.hoisted(() => ({ fitBounds: vi.fn(), jumpTo: vi.fn(), setWorkerUrl: vi.fn() }))

vi.mock("maplibre-gl", () => ({ setWorkerUrl: mapCalls.setWorkerUrl }))

vi.mock("react-map-gl/maplibre", async () => {
  const React = await import("react")
  const Map = React.forwardRef(function MockMap(
    { children, onLoad }: { children: ReactNode; onLoad?: () => void },
    ref: React.ForwardedRef<unknown>
  ) {
    React.useImperativeHandle(ref, () => mapCalls)
    React.useEffect(() => onLoad?.(), [onLoad])
    return <div data-testid="maplibre-map">{children}</div>
  })

  return {
    default: Map,
    Layer: ({ id }: { id: string }) => <div data-testid={id} />,
    Marker: ({ children }: { children: ReactNode }) => <>{children}</>,
    NavigationControl: () => <div data-testid="navigation-control" />,
    Source: ({ children }: { children: ReactNode }) => <>{children}</>,
  }
})

function sample(elapsedSeconds: number, latitudeDegrees: number, longitudeDegrees: number): RideSample {
  return {
    elapsedSeconds,
    timestamp: new Date(elapsedSeconds * 1000),
    powerWatts: 200,
    speedMps: 10,
    distanceMeters: elapsedSeconds * 10,
    altitudeMeters: 20,
    latitudeDegrees,
    longitudeDegrees,
  }
}

beforeEach(() => {
  mapCalls.fitBounds.mockReset()
  mapCalls.jumpTo.mockReset()
})

describe("RideMap", () => {
  it("shows a single coordinate at a default zoom instead of fitting bounds", async () => {
    render(<RideMap samples={[sample(0, 42, -71)]} hoverSample={null} />)

    expect(screen.getByLabelText("Ride route map").className).toContain("min-w-0")
    expect(mapCalls.setWorkerUrl).toHaveBeenCalledWith("/maplibre/maplibre-gl-worker.mjs")
    await waitFor(() => expect(mapCalls.jumpTo).toHaveBeenCalledWith({ center: [-71, 42], zoom: 13 }))
    expect(mapCalls.fitBounds).not.toHaveBeenCalled()
    expect(screen.getByTestId("ride-point-dot")).toBeDefined()
  })

  it("fits a complete route once and does not move the viewport when the hover marker changes", async () => {
    const samples = [sample(0, 42, -71), sample(10, 42.1, -70.9)]
    const { rerender } = render(<RideMap samples={samples} hoverSample={null} />)

    await waitFor(() => expect(mapCalls.fitBounds).toHaveBeenCalled())
    const fitCount = mapCalls.fitBounds.mock.calls.length
    rerender(<RideMap samples={samples} hoverSample={gpsSamples(samples)[1]} />)

    expect(screen.getByTestId("ride-hover-marker")).toBeDefined()
    expect(mapCalls.fitBounds).toHaveBeenCalledTimes(fitCount)
    expect(mapCalls.jumpTo).not.toHaveBeenCalled()
  })
})
