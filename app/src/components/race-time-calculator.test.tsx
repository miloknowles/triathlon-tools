import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it } from "vitest"

import { RaceTimeCalculator } from "@/components/race-time-calculator"

beforeEach(() => window.localStorage.clear())

describe("RaceTimeCalculator", () => {
  it("starts with Olympic distances, blank targets, and default transitions", () => {
    render(<RaceTimeCalculator />)
    expect(screen.getByRole("button", { name: "Olympic" }).getAttribute("aria-pressed")).toBe("true")
    expect((screen.getByLabelText("Swim distance") as HTMLInputElement).value).toBe("1500")
    expect((screen.getByLabelText("Bike distance") as HTMLInputElement).value).toBe("40")
    expect((screen.getByLabelText("Run distance") as HTMLInputElement).value).toBe("10")
    expect((screen.getByLabelText("T1 time") as HTMLInputElement).value).toBe("2:00")
    expect((screen.getByLabelText("T2 time") as HTMLInputElement).value).toBe("1:00")
    expect(screen.getByLabelText("Total race time").textContent).toBe("—:—:—")
    expect(screen.getByText(/valid swim, bike, run target/)).toBeDefined()
  })

  it("calculates live from mixed time, speed, and pace targets", () => {
    render(<RaceTimeCalculator />)
    fireEvent.change(screen.getByLabelText("Swim time"), { target: { value: "30:00" } })
    expect((screen.getByLabelText("Swim pace") as HTMLInputElement).value).toBe("2:00")
    fireEvent.change(screen.getByLabelText("Bike speed"), { target: { value: "20" } })
    expect((screen.getByLabelText("Bike time") as HTMLInputElement).value).toBe("02:00:00")
    fireEvent.change(screen.getByLabelText("Run pace"), { target: { value: "5:00" } })
    expect((screen.getByLabelText("Run time") as HTMLInputElement).value).toBe("00:50:00")
    expect(screen.getByLabelText("Total race time").textContent).toBe("03:23:00")
  })

  it("lets fields be cleared and normalizes overflowing time on blur", () => {
    render(<RaceTimeCalculator />)
    const swimTime = screen.getByLabelText("Swim time") as HTMLInputElement
    fireEvent.change(swimTime, { target: { value: "0:29:75" } })
    fireEvent.blur(swimTime)
    expect(swimTime.value).toBe("00:30:15")
    fireEvent.change(swimTime, { target: { value: "" } })
    expect(swimTime.value).toBe("")
    expect((screen.getByLabelText("Swim pace") as HTMLInputElement).value).toBe("")
  })

  it("marks edited presets custom and preserves targets across preset changes", () => {
    render(<RaceTimeCalculator />)
    fireEvent.change(screen.getByLabelText("Swim time"), { target: { value: "30:00" } })
    fireEvent.change(screen.getByLabelText("Swim distance"), { target: { value: "1600" } })
    expect(screen.getByRole("button", { name: "Custom" }).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "Half" }))
    expect((screen.getByLabelText("Swim distance") as HTMLInputElement).value).toBe("1.2")
    expect((screen.getByLabelText("Swim distance unit") as HTMLSelectElement).value).toBe("mi")
    expect((screen.getByLabelText("Swim time") as HTMLInputElement).value).toBe("30:00")
    expect((screen.getByLabelText("T1 time") as HTMLInputElement).value).toBe("2:00")
  })

  it("converts existing values when units change", () => {
    render(<RaceTimeCalculator />)
    fireEvent.change(screen.getByLabelText("Bike speed"), { target: { value: "32.2" } })
    fireEvent.change(screen.getByLabelText("Bike speed unit"), { target: { value: "mph" } })
    expect((screen.getByLabelText("Bike speed") as HTMLInputElement).value).toBe("20.0")
    fireEvent.change(screen.getByLabelText("Run pace"), { target: { value: "5:00" } })
    fireEvent.change(screen.getByLabelText("Run pace unit"), { target: { value: "min/mi" } })
    expect((screen.getByLabelText("Run pace") as HTMLInputElement).value).toBe("8:03")
  })

  it("restores inputs from local storage", async () => {
    const first = render(<RaceTimeCalculator />)
    fireEvent.click(screen.getByRole("button", { name: "Half" }))
    fireEvent.change(screen.getByLabelText("Swim time"), { target: { value: "40:00" } })
    fireEvent.change(screen.getByLabelText("T1 time"), { target: { value: "4:30" } })
    await waitFor(() => expect(window.localStorage.getItem("triathlon-tools:race-calculator:v1")).toContain("40:00"))
    first.unmount()

    render(<RaceTimeCalculator />)
    await waitFor(() => expect((screen.getByLabelText("Swim time") as HTMLInputElement).value).toBe("40:00"))
    expect(screen.getByRole("button", { name: "Half" }).getAttribute("aria-pressed")).toBe("true")
    expect((screen.getByLabelText("Swim distance") as HTMLInputElement).value).toBe("1.2")
    expect((screen.getByLabelText("T1 time") as HTMLInputElement).value).toBe("4:30")
  })
})
