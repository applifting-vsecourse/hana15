import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { EmojiPicker } from "@/features/quack/components/EmojiPicker"

describe("EmojiPicker", () => {
  it("hands the picked emoji to the caller and closes", async () => {
    const onSelect = vi.fn()
    render(<EmojiPicker onSelect={onSelect} />)

    await userEvent.click(screen.getByRole("button", { name: "Add emoji" }))
    await userEvent.click(screen.getByRole("button", { name: "Insert 🦆" }))

    expect(onSelect).toHaveBeenCalledExactlyOnceWith("🦆")
    expect(screen.queryByRole("button", { name: "Insert 🦆" })).not.toBeInTheDocument()
  })

  it("can't be opened while disabled", () => {
    render(
      <EmojiPicker
        onSelect={vi.fn()}
        isDisabled
      />,
    )

    expect(screen.getByRole("button", { name: "Add emoji" })).toBeDisabled()
  })
})
