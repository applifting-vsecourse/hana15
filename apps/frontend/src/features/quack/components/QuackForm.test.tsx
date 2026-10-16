import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addQuack } from "@/features/quack/api/addQuack"
import { QuackForm } from "@/features/quack/components/QuackForm"

vi.mock("@/features/quack/api/addQuack", () => ({ addQuack: vi.fn() }))

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <QuackForm />
    </QueryClientProvider>,
  )
}

// React Query passes a context as 2nd argument; only the payload matters here.
const sentPayload = () => vi.mocked(addQuack).mock.calls[0]?.[0]

const optionFields = () => screen.queryAllByLabelText(/^Option \d$/)

describe("QuackForm poll", () => {
  beforeEach(() => vi.mocked(addQuack).mockReset())

  it("has the poll switch off and shows no options by default", () => {
    renderForm()

    expect(screen.getByRole("switch", { name: "Add poll" })).not.toBeChecked()
    expect(optionFields()).toHaveLength(0)
    expect(screen.getByLabelText("New quack")).toBeInTheDocument()
  })

  it("shows two options and calls the text a question when the switch is on", async () => {
    renderForm()

    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))

    expect(optionFields()).toHaveLength(2)
    expect(screen.getByLabelText("Question")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /^Remove option/ })).not.toBeInTheDocument()
  })

  it("adds options up to five, then hides the button, and removes them down to two", async () => {
    renderForm()
    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))

    for (let i = 0; i < 3; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Add option" }))
    }
    expect(optionFields()).toHaveLength(5)
    expect(screen.queryByRole("button", { name: "Add option" })).not.toBeInTheDocument()

    for (let i = 0; i < 3; i++) {
      await userEvent.click(screen.getByRole("button", { name: "Remove option 1" }))
    }
    expect(optionFields()).toHaveLength(2)
    expect(screen.queryByRole("button", { name: /^Remove option/ })).not.toBeInTheDocument()
  })

  it("blocks submit and names the problem for empty and duplicate options", async () => {
    renderForm()
    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))
    await userEvent.type(screen.getByLabelText("Question"), "Lunch?")
    await userEvent.type(screen.getByLabelText("Option 1"), "Thai")
    await userEvent.click(screen.getByRole("button", { name: "Add option" }))
    await userEvent.type(screen.getByLabelText("Option 2"), " thai ")

    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await screen.findByText("Same as option 1")).toBeInTheDocument()
    expect(screen.getByText("Write an answer or remove this option")).toBeInTheDocument()
    expect(addQuack).not.toHaveBeenCalled()
  })

  it("shows the option errors together with an error in the question", async () => {
    renderForm()
    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))

    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await screen.findByText("Write something first")).toBeInTheDocument()
    expect(screen.getAllByText("Write an answer or remove this option")).toHaveLength(2)
  })

  it("rejects an option longer than 60 characters", async () => {
    renderForm()
    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))
    await userEvent.type(screen.getByLabelText("Question"), "Lunch?")
    await userEvent.click(screen.getByLabelText("Option 1"))
    await userEvent.paste("x".repeat(61))
    await userEvent.type(screen.getByLabelText("Option 2"), "Pizza")

    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    expect(await screen.findByText("Keep it under 60 characters")).toBeInTheDocument()
    expect(addQuack).not.toHaveBeenCalled()
  })

  it("sends trimmed options, then resets the form with the switch off", async () => {
    vi.mocked(addQuack).mockResolvedValue({} as Awaited<ReturnType<typeof addQuack>>)
    renderForm()
    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))
    await userEvent.type(screen.getByLabelText("Question"), "Lunch?")
    await userEvent.type(screen.getByLabelText("Option 1"), " Thai ")
    await userEvent.type(screen.getByLabelText("Option 2"), "Pizza")

    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(sentPayload()).toEqual({
      text: "Lunch?",
      mood: undefined,
      pollOptions: ["Thai", "Pizza"],
    })
    await waitFor(() => expect(screen.getByRole("switch", { name: "Add poll" })).not.toBeChecked())
    expect(optionFields()).toHaveLength(0)
  })

  it("posts a plain quack without options while the switch is off", async () => {
    vi.mocked(addQuack).mockResolvedValue({} as Awaited<ReturnType<typeof addQuack>>)
    renderForm()
    // Fill options, then switch the poll off again: they must not be sent.
    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))
    await userEvent.type(screen.getByLabelText("Option 1"), "Thai")
    await userEvent.click(screen.getByRole("switch", { name: "Add poll" }))
    await userEvent.type(screen.getByLabelText("New quack"), "hello")

    await userEvent.click(screen.getByRole("button", { name: "Quack" }))

    await waitFor(() => expect(addQuack).toHaveBeenCalled())
    expect(sentPayload()).toEqual({ text: "hello", mood: undefined, pollOptions: undefined })
  })
})
