// Example component test — the pattern to copy for your own components.
import type { ReactElement } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackList } from "@/features/quack/components/QuackList"

// Quack items use query hooks (replies), so they need a client.
const renderWithClient = (ui: ReactElement) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>)

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "quack quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: null,
  threadId: null,
  replyToId: null,
  replyToUser: null,
  replyToDeleted: false,
  deleted: false,
  replyCount: 0,
  ...overrides,
})

describe("QuackList", () => {
  it("renders quacks with author info", () => {
    renderWithClient(<QuackList quacks={[quack()]} />)

    expect(screen.getByText("quack quack")).toBeInTheDocument()
    expect(screen.getByText("Caffeinated Duck")).toBeInTheDocument()
    expect(screen.getByText("@CaffeinatedDuck")).toBeInTheDocument()
  })

  it("shows the mood of a quack that has one", () => {
    renderWithClient(<QuackList quacks={[quack({ mood: "angry" })]} />)

    expect(screen.getByText("Angry")).toBeInTheDocument()
  })

  it("shows no mood for a quack without one", () => {
    renderWithClient(<QuackList quacks={[quack()]} />)

    for (const label of ["Happy", "Sad", "Angry", "Silly"]) {
      expect(screen.queryByText(label)).not.toBeInTheDocument()
    }
  })

  it("says there are no quacks yet when the feed is empty", () => {
    renderWithClient(<QuackList quacks={[]} />)

    expect(screen.getByText("No quacks yet. Post the first one.")).toBeInTheDocument()
  })

  it("shows a custom empty message, e.g. for a search without matches", () => {
    renderWithClient(
      <QuackList
        quacks={[]}
        emptyMessage="No quacks match “bread”"
      />,
    )

    expect(screen.getByText("No quacks match “bread”")).toBeInTheDocument()
  })

  it("shows an error with a working reload button", async () => {
    const onReload = vi.fn()
    renderWithClient(
      <QuackList
        quacks={[]}
        error={new Error("Server unreachable")}
        onReload={onReload}
      />,
    )

    expect(screen.getByText("Couldn't load quacks")).toBeInTheDocument()
    expect(screen.getByText("Server unreachable")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /reload/i }))
    expect(onReload).toHaveBeenCalledOnce()
  })
})
