import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { votePoll } from "@/features/quack/api/votePoll"
import { QuackItem } from "@/features/quack/components/QuackItem"

vi.mock("@/features/quack/api/votePoll", () => ({ votePoll: vi.fn() }))

const poll = (overrides: Partial<Poll> = {}): Poll => ({
  myOptionId: null,
  options: [
    { id: "a", text: "Thai", votes: 2 },
    { id: "b", text: "Pizza", votes: 1 },
  ],
  ...overrides,
})

const quack = (pollValue: Poll | null): Quack => ({
  id: "q1",
  text: "Where for lunch?",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: { id: "u1", name: "Caffeinated Duck", username: "CaffeinatedDuck" },
  poll: pollValue,
})

// What the "server" returns when the feed is refetched after a vote.
let feedFromServer: Quack[] = []

// Renders the quack from the query cache, the way the feed does, so optimistic
// updates and rollbacks show up in the DOM.
function Feed() {
  const { data } = useQuery({
    queryKey: quackKeys.list(undefined),
    queryFn: () => Promise.resolve(feedFromServer),
    staleTime: Infinity,
  })
  return data?.[0] ? <QuackItem quack={data[0]} /> : null
}

function renderFeedItem(initial: Quack) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  feedFromServer = [initial]
  client.setQueryData(quackKeys.list(undefined), [initial])
  render(
    <QueryClientProvider client={client}>
      <Feed />
    </QueryClientProvider>,
  )
  return client
}

describe("QuackPoll", () => {
  beforeEach(() => vi.mocked(votePoll).mockReset())

  it("shows votes, shares and the total for each option", () => {
    renderFeedItem(quack(poll()))

    expect(screen.getByRole("button", { name: /Thai/ })).toHaveTextContent("2 · 67 %")
    expect(screen.getByRole("button", { name: /Pizza/ })).toHaveTextContent("1 · 33 %")
    expect(screen.getByText("3 votes")).toBeInTheDocument()
  })

  it("says 1 vote in the singular", () => {
    renderFeedItem(
      quack(
        poll({
          options: [
            { id: "a", text: "Thai", votes: 1 },
            { id: "b", text: "Pizza", votes: 0 },
          ],
        }),
      ),
    )

    expect(screen.getByText("1 vote")).toBeInTheDocument()
  })

  it("shows zeros, no percentages and an invitation when nobody voted", () => {
    renderFeedItem(
      quack(
        poll({
          options: [
            { id: "a", text: "Thai", votes: 0 },
            { id: "b", text: "Pizza", votes: 0 },
          ],
        }),
      ),
    )

    expect(screen.getByText("Be the first to vote")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Thai/ })).toHaveTextContent(/^Thai0$/)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it("highlights the option the user voted for", () => {
    renderFeedItem(quack(poll({ myOptionId: "b" })))

    expect(screen.getByRole("button", { name: /Pizza/ })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: /Thai/ })).toHaveAttribute("aria-pressed", "false")
  })

  it("renders no poll for a plain quack", () => {
    renderFeedItem(quack(null))

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByText(/vote/i)).not.toBeInTheDocument()
  })

  it("does nothing when the user clicks the option they already chose", async () => {
    renderFeedItem(quack(poll({ myOptionId: "a" })))

    await userEvent.click(screen.getByRole("button", { name: /Thai/ }))

    expect(votePoll).not.toHaveBeenCalled()
  })

  it("moves the vote on the server and sends the chosen option", async () => {
    vi.mocked(votePoll).mockResolvedValue(
      poll({
        myOptionId: "b",
        options: [
          { id: "a", text: "Thai", votes: 1 },
          { id: "b", text: "Pizza", votes: 2 },
        ],
      }),
    )
    renderFeedItem(quack(poll({ myOptionId: "a" })))

    await userEvent.click(screen.getByRole("button", { name: /Pizza/ }))

    await waitFor(() => expect(votePoll).toHaveBeenCalledWith({ quackId: "q1", optionId: "b" }))
  })

  it("rolls back and offers a retry when the vote can't be saved", async () => {
    vi.mocked(votePoll).mockRejectedValueOnce(new Error("boom"))
    const client = renderFeedItem(quack(poll({ myOptionId: "a" })))

    await userEvent.click(screen.getByRole("button", { name: /Pizza/ }))

    expect(await screen.findByRole("alert")).toHaveTextContent("Your vote wasn't saved.")
    const cached = client.getQueryData<Quack[]>(quackKeys.list(undefined))
    expect(cached?.[0]?.poll).toEqual(poll({ myOptionId: "a" }))

    vi.mocked(votePoll).mockResolvedValueOnce(poll({ myOptionId: "b" }))
    await userEvent.click(screen.getByRole("button", { name: "Try again" }))

    await waitFor(() => expect(votePoll).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument())
  })
})
