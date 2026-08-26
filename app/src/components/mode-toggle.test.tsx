import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ModeToggle } from "@/components/mode-toggle"

const { setTheme } = vi.hoisted(() => ({ setTheme: vi.fn() }))

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme }),
}))

beforeEach(() => {
  setTheme.mockReset()
})

describe("ModeToggle", () => {
  it.each(["light", "dark", "system"])("selects the %s theme", async (theme) => {
    const user = userEvent.setup()
    render(<ModeToggle />)

    await user.click(screen.getByRole("button", { name: "Toggle theme" }))
    await user.click(await screen.findByRole("menuitem", { name: new RegExp(`^${theme}$`, "i") }))

    expect(setTheme).toHaveBeenCalledWith(theme)
  })
})
