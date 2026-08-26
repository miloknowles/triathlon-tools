import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import { BIKE_SIMULATOR_STORAGE_KEY, BikeSimulator } from "@/components/bike-simulator"

function uploadedFile(name: string, contents: string) {
  const file = new File([contents], name, { type: "application/gpx+xml" })
  Object.defineProperty(file, "text", { value: vi.fn().mockResolvedValue(contents) })
  return file
}

const validGpx = `<?xml version="1.0"?><gpx version="1.1"><trk><trkseg>
  <trkpt lat="0" lon="0"><ele>10</ele></trkpt>
  <trkpt lat="0" lon="0.001"><ele>12</ele></trkpt>
</trkseg></trk></gpx>`

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

beforeEach(() => {
  vi.restoreAllMocks()
  window.localStorage.clear()
})

describe("BikeSimulator custom courses", () => {
  it("restores saved inputs and ignores malformed stored values", async () => {
    window.localStorage.setItem(BIKE_SIMULATOR_STORAGE_KEY, JSON.stringify({
      version: 1,
      units: "metric",
      values: {
        courseName: "chattanooga_703",
        avgPowerWatts: 310,
        avgCdA: 0.24,
        racePositionPercent: 98,
        avgCrr: 0.0033,
        lossDrivetrain: 3.7,
        massRiderKg: 70,
        massBikeKg: 9,
        ambientTempCelsius: 25,
        relativeHumidity: 60,
      },
    }))

    render(<BikeSimulator />)

    await waitFor(() => expect((screen.getByLabelText("Race power") as HTMLInputElement).value).toBe("310"))
    expect((screen.getByLabelText("Aerodynamic drag") as HTMLInputElement).value).toBe("0.24")
    expect((screen.getByLabelText("Race course") as HTMLInputElement).value).toBe("🇺🇸 70.3 Chattanooga")
  })

  it("saves input changes for the next browser visit", async () => {
    const user = userEvent.setup()
    render(<BikeSimulator />)
    const power = screen.getByLabelText("Race power")

    await user.clear(power)
    await user.type(power, "275")

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(BIKE_SIMULATOR_STORAGE_KEY) ?? "{}")
      expect(stored.values.avgPowerWatts).toBe(275)
    })
  })

  it("falls back to defaults when saved input data is malformed", async () => {
    window.localStorage.setItem(BIKE_SIMULATOR_STORAGE_KEY, "not-json")
    render(<BikeSimulator />)

    await waitFor(() => expect((screen.getByLabelText("Race power") as HTMLInputElement).value).toBe("250"))
  })

  it("uses practical increments for common race inputs", async () => {
    render(<BikeSimulator />)
    await waitFor(() => expect(window.localStorage.getItem(BIKE_SIMULATOR_STORAGE_KEY)).not.toBeNull())

    expect(screen.getByLabelText("Relative humidity").getAttribute("step")).toBe("5")
    expect(screen.getByLabelText("Race power").getAttribute("step")).toBe("5")
    expect(screen.getByLabelText("Rider mass").getAttribute("step")).toBe("1")
    expect(screen.getByLabelText("Bike mass").getAttribute("step")).toBe("1")
  })

  it("searches and selects a preset course", async () => {
    const user = userEvent.setup()
    render(<BikeSimulator />)

    const courseInput = screen.getByLabelText("Race course")
    await user.click(courseInput)
    await user.clear(courseInput)
    await user.type(courseInput, "Chattanooga")

    expect(screen.queryByRole("option", { name: /Santa Cruz/ })).toBeNull()
    await user.click(screen.getByRole("option", { name: /70\.3 Chattanooga/ }))

    expect((courseInput as HTMLInputElement).value).toBe("🇺🇸 70.3 Chattanooga")
    expect(screen.getByRole("link", { name: "View source route" }).getAttribute("href")).toBe(
      "https://ridewithgps.com/routes/6491948?lang=en"
    )
  })

  it("clears the selected course and remembers the empty selection", async () => {
    const user = userEvent.setup()
    render(<BikeSimulator />)
    await waitFor(() => expect(window.localStorage.getItem(BIKE_SIMULATOR_STORAGE_KEY)).not.toBeNull())

    await user.click(screen.getByRole("button", { name: "Clear selection" }))

    expect((screen.getByLabelText("Race course") as HTMLInputElement).value).toBe("")
    expect((screen.getByRole("button", { name: "Run simulation" }) as HTMLButtonElement).disabled).toBe(true)
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(BIKE_SIMULATOR_STORAGE_KEY) ?? "{}")
      expect(stored.values.courseName).toBe("")
    })
  })

  it("imports and simulates in-memory data while preserving it after a failed import", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch")
    const user = userEvent.setup()
    render(<BikeSimulator />)

    const input = screen.getByLabelText("Import GPX")
    fireEvent.change(input, { target: { files: [uploadedFile("local-route.gpx", validGpx)] } })

    expect(await screen.findByText("local-route.gpx")).toBeDefined()
    expect(screen.getByText(/0\.1 km · 2 m gain · 2 points/)).toBeDefined()
    expect(screen.getByText("Processed locally—your file isn’t uploaded.")).toBeDefined()

    const racePositionInput = screen.getByLabelText("Time in race position")
    await user.clear(racePositionInput)
    await user.type(racePositionInput, "0")
    await user.click(screen.getByRole("button", { name: "Run simulation" }))
    expect(await screen.findByText("Course profile")).toBeDefined()
    expect(screen.getByText("Velocity")).toBeDefined()
    expect(screen.getByText("Power losses")).toBeDefined()
    expect(screen.getByText("Time out of race position")).toBeDefined()
    const predictedSplitCard = screen.getByText("Predicted split").closest('[data-slot="card"]')
    const timeOutCard = screen.getByText("Time out of race position").closest('[data-slot="card"]')
    expect(timeOutCard?.querySelector('[data-slot="card-title"]')?.textContent).toBe(
      predictedSplitCard?.querySelector('[data-slot="card-title"]')?.textContent
    )
    expect(screen.getByText("Predicted performance for local-route.gpx.")).toBeDefined()
    expect(fetchMock).not.toHaveBeenCalled()

    fireEvent.change(input, { target: { files: [uploadedFile("broken.gpx", "<gpx>")] } })
    expect(await screen.findByText("Import failed")).toBeDefined()
    expect(screen.getByText("local-route.gpx")).toBeDefined()

    await user.click(screen.getByRole("button", { name: "Remove" }))
    await waitFor(() => expect(screen.queryByText("local-route.gpx")).toBeNull())
    expect(screen.queryByText("Course profile")).toBeNull()
  })
})
