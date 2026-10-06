import { useState } from "react"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { QuackSearch } from "@/features/quack/components/QuackSearch"

function ControlledSearch() {
  const [value, setValue] = useState("")
  return (
    <QuackSearch
      value={value}
      onChange={setValue}
    />
  )
}

describe("QuackSearch", () => {
  it("has a visible label", () => {
    render(<ControlledSearch />)

    expect(screen.getByLabelText("Search quacks")).toBeInTheDocument()
  })

  it("offers a clear button only once something is typed", async () => {
    render(<ControlledSearch />)

    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText("Search quacks"), "bread")

    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument()
  })

  it("clears the box and puts the cursor back in it", async () => {
    render(<ControlledSearch />)
    const input = screen.getByLabelText("Search quacks")

    await userEvent.type(input, "bread")
    await userEvent.click(screen.getByRole("button", { name: "Clear search" }))

    expect(input).toHaveValue("")
    expect(input).toHaveFocus()
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument()
  })
})
