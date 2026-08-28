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
        avgCdA: 0.241,
        racePositionPercent: 98,
        avgCrr: 0.0042,
        lossDrivetrain: 3.3,
        massRiderKg: 70,
        massBikeKg: 9,
        ambientTempCelsius: 25,
        relativeHumidity: 60,
        maxSpeedMps: 25,
      },
    }))

    render(<BikeSimulator />)

    await waitFor(() => expect((screen.getByLabelText("Race power") as HTMLInputElement).value).toBe("310"))
    expect((screen.getByLabelText("Aerodynamic drag") as HTMLInputElement).value).toBe("0.241")
    expect((screen.getByLabelText("Rolling resistance") as HTMLInputElement).value).toBe("0.0042")
    expect((screen.getByLabelText("Drivetrain loss") as HTMLInputElement).value).toBe("3.3")
    expect((screen.getByLabelText("Maximum speed") as HTMLInputElement).value).toBe("90")
    expect((screen.getByLabelText("Race course") as HTMLInputElement).value).toBe("🇺🇸 70.3 Chattanooga")
  })

  it("saves input changes for the next browser visit", async () => {
    const user = userEvent.setup()
    render(<BikeSimulator />)
    const power = screen.getByLabelText("Race power")
    const maximumSpeed = screen.getByLabelText("Maximum speed")

    await user.clear(power)
    await user.type(power, "275")
    await user.clear(maximumSpeed)
    await user.type(maximumSpeed, "72")

    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem(BIKE_SIMULATOR_STORAGE_KEY) ?? "{}")
      expect(stored.values.avgPowerWatts).toBe(275)
      expect(stored.values.maxSpeedMps).toBeCloseTo(20, 8)
    })
  })

  it("falls back to defaults when saved input data is malformed", async () => {
    window.localStorage.setItem(BIKE_SIMULATOR_STORAGE_KEY, "not-json")
    render(<BikeSimulator />)

    await waitFor(() => expect((screen.getByLabelText("Race power") as HTMLInputElement).value).toBe("250"))
  })

  it("uses the revised equipment defaults for a new session", async () => {
    render(<BikeSimulator />)

    await waitFor(() => expect(window.localStorage.getItem(BIKE_SIMULATOR_STORAGE_KEY)).not.toBeNull())
    expect((screen.getByLabelText("Aerodynamic drag") as HTMLInputElement).value).toBe("0.27")
    expect((screen.getByLabelText("Rolling resistance") as HTMLInputElement).value).toBe("0.0035")
    expect((screen.getByLabelText("Drivetrain loss") as HTMLInputElement).value).toBe("2.5")
  })

  it("applies every equipment preset to its editable numeric input", async () => {
    const user = userEvent.setup()
    render(<BikeSimulator />)

    const cases = [
      ["Aerodynamic drag", "Road — hoods", "0.34"],
      ["Aerodynamic drag", "Road — aero", "0.3"],
      ["Aerodynamic drag", "Tri — aerobars", "0.27"],
      ["Aerodynamic drag", "Tri — optimized", "0.23"],
      ["Rolling resistance", "Race tire / smooth road", "0.0025"],
      ["Rolling resistance", "Race tire / typical road", "0.0035"],
      ["Rolling resistance", "Durable tire / typical road", "0.005"],
      ["Rolling resistance", "Rough pavement", "0.0065"],
      ["Drivetrain loss", "Wheel-measured power", "0"],
      ["Drivetrain loss", "Race-prepped", "2"],
      ["Drivetrain loss", "Clean and lubricated", "2.5"],
      ["Drivetrain loss", "Dirty or wet", "5"],
    ] as const

    for (const [inputLabel, buttonLabel, expected] of cases) {
      await user.click(screen.getByRole("button", { name: buttonLabel }))
      expect((screen.getByLabelText(inputLabel) as HTMLInputElement).value).toBe(expected)
    }
  })

  it("uses practical increments for common race inputs", async () => {
    render(<BikeSimulator />)
    await waitFor(() => expect(window.localStorage.getItem(BIKE_SIMULATOR_STORAGE_KEY)).not.toBeNull())

    expect(screen.getByLabelText("Relative humidity").getAttribute("step")).toBe("5")
    expect(screen.getByLabelText("Race power").getAttribute("step")).toBe("5")
    expect((screen.getByLabelText("Maximum speed") as HTMLInputElement).value).toBe("80")
    expect(screen.getByLabelText("Maximum speed").getAttribute("step")).toBe("1")
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
