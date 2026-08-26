import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Navbar } from "@/components/navbar"

describe("Navbar", () => {
  it("lists Race Calculator first in desktop navigation", () => {
    render(<Navbar />)
    const navigation = screen.getByRole("navigation", { name: "Main navigation" })
    const links = Array.from(navigation.querySelectorAll("a")).map((link) => link.textContent?.trim())
    expect(links.slice(0, 3)).toEqual(["Race Calculator", "Bike Split Predictor", "CdA Estimator"])
  })

  it("exposes all three tools in the compact Tools menu", async () => {
    render(<Navbar />)
    fireEvent.click(screen.getByRole("button", { name: "Tools" }))
    expect(await screen.findByRole("menuitem", { name: "Race Calculator" })).toBeDefined()
    expect(screen.getByRole("menuitem", { name: "Bike Split Predictor" })).toBeDefined()
    expect(screen.getByRole("menuitem", { name: "CdA Estimator" })).toBeDefined()
  })
})
