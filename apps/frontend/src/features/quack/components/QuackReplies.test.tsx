import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { HTTPError } from "ky"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { addReply } from "@/features/quack/api/addReply"
import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackItem } from "@/features/quack/components/QuackItem"
import { replyCountLabel } from "@/features/quack/components/replyCount"

vi.mock("@/features/quack/api/addReply", () => ({ addReply: vi.fn() }))
vi.mock("@/lib/api-client", async () => {
  const { HTTPError: Error } = await import("ky")
  return {
    HTTPError: Error,
    api: { get: (url: string) => ({ json: () => Promise.resolve(serverReplies[url]) }) },
  }
})

const aUser = (n: number) => ({ id: `u${n}`, name: `Duck ${n}`, username: `Duck${n}` })

const quack = (overrides: Partial<Quack> = {}): Quack => ({
  id: "q1",
  text: "root quack",
  mood: null,
  userId: "u1",
  createdAt: new Date("2026-01-01T12:00:00Z"),
  user: aUser(1),
  poll: null,
  threadId: null,
  replyToId: null,
  replyToUser: null,
  replyCount: 0,
  ...overrides,
})

const reply = (id: string, n: number, overrides: Partial<Quack> = {}) =>
  quack({
    id,
    text: `text of ${id}`,
    userId: `u${n}`,
    user: aUser(n),
    threadId: "q1",
    replyToId: "q1",
    ...overrides,
  })

let serverReplies: Record<string, unknown[]> = {}

function renderItem(q: Quack, props: { currentUserId?: string; isModerator?: boolean } = {}) {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}
    >
      <QuackItem
        quack={q}
        {...props}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.mocked(addReply).mockReset()
  serverReplies = {}
})

describe("replyCountLabel", () => {
  it.each([
    [1, "1 odpověď"],
    [2, "2 odpovědi"],
    [4, "4 odpovědi"],
    [5, "5 odpovědí"],
    [12, "12 odpovědí"],
  ])("%i → %s", (count, label) => {
    expect(replyCountLabel(count)).toBe(label)
  })
})

describe("replies under a quack", () => {
  it("shows only Odpovědět and no count when nobody replied", () => {
    renderItem(quack())

    expect(screen.getByRole("button", { name: "Odpovědět" })).toBeInTheDocument()
    expect(screen.queryByText(/odpověď|odpovědi|odpovědí/)).not.toBeInTheDocument()
  })

  it("starts collapsed, expands on click of the count and collapses again", async () => {
    serverReplies["quacks/q1/replies"] = [reply("r1", 2), reply("r2", 3)]
    renderItem(quack({ replyCount: 2 }))
    const user = userEvent.setup()

    expect(screen.queryByText("text of r1")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "2 odpovědi" }))
    expect(await screen.findByText("text of r1")).toBeInTheDocument()
    expect(screen.getByText("text of r2")).toBeInTheDocument()
    expect(screen.getByText("Duck 2")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "2 odpovědi" }))
    expect(screen.queryByText("text of r1")).not.toBeInTheDocument()
  })

  it("says who a reply to a reply answers, and says nothing for a direct reply", async () => {
    serverReplies["quacks/q1/replies"] = [
      reply("r1", 2),
      reply("r2", 3, { replyToId: "r1", replyToUser: aUser(2) }),
    ]
    renderItem(quack({ replyCount: 2 }))
    await userEvent.setup().click(screen.getByRole("button", { name: "2 odpovědi" }))

    await screen.findByText("text of r2")
    expect(screen.getAllByText(/v odpovědi na/)).toHaveLength(1)
    expect(screen.getByText("v odpovědi na @Duck2")).toBeInTheDocument()
  })

  it("rejects an empty or whitespace-only reply with a message and sends nothing", async () => {
    renderItem(quack())
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Odpovědět" }))
    await user.type(screen.getByLabelText("Vaše odpověď"), "   ")
    await user.click(screen.getByRole("button", { name: "Odeslat" }))

    expect(screen.getByText("Napište odpověď.")).toBeInTheDocument()
    expect(addReply).not.toHaveBeenCalled()
  })

  it("sends the trimmed text to the answered quack, then closes and empties the form and expands", async () => {
    vi.mocked(addReply).mockResolvedValue(reply("r9", 1))
    serverReplies["quacks/q1/replies"] = [reply("r9", 1)]
    renderItem(quack({ replyCount: 0 }))
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Odpovědět" }))
    await user.type(screen.getByLabelText("Vaše odpověď"), "  hello  ")
    await user.click(screen.getByRole("button", { name: "Odeslat" }))

    await waitFor(() => expect(addReply).toHaveBeenCalledTimes(1))
    expect(vi.mocked(addReply).mock.calls[0]?.[0]).toEqual({ targetId: "q1", text: "hello" })
    await waitFor(() => expect(screen.queryByLabelText("Vaše odpověď")).not.toBeInTheDocument())
    expect(await screen.findByText("text of r9")).toBeInTheDocument()
  })

  it("replying to a reply targets that reply", async () => {
    vi.mocked(addReply).mockResolvedValue(reply("r2", 1))
    serverReplies["quacks/q1/replies"] = [reply("r1", 2)]
    renderItem(quack({ replyCount: 1 }))
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "1 odpověď" }))
    const item = (await screen.findByText("text of r1")).closest("article")!
    await user.click(within(item).getByRole("button", { name: "Odpovědět" }))
    await user.type(screen.getByLabelText("Vaše odpověď"), "hi")
    await user.click(screen.getByRole("button", { name: "Odeslat" }))

    await waitFor(() => expect(addReply).toHaveBeenCalled())
    expect(vi.mocked(addReply).mock.calls[0]?.[0]).toEqual({ targetId: "r1", text: "hi" })
  })

  it("keeps the text and says the reply failed when saving fails", async () => {
    vi.mocked(addReply).mockRejectedValue(new Error("boom"))
    renderItem(quack())
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Odpovědět" }))
    await user.type(screen.getByLabelText("Vaše odpověď"), "keep me")
    await user.click(screen.getByRole("button", { name: "Odeslat" }))

    expect(await screen.findByText("Odpověď se nepodařilo odeslat.")).toBeInTheDocument()
    expect(screen.getByLabelText("Vaše odpověď")).toHaveValue("keep me")
  })

  it("says the target is gone on a 404 and keeps the text", async () => {
    vi.mocked(addReply).mockRejectedValue(
      new HTTPError(new Response(null, { status: 404 }), new Request("http://x"), {} as never),
    )
    renderItem(quack())
    const user = userEvent.setup()

    await user.click(screen.getByRole("button", { name: "Odpovědět" }))
    await user.type(screen.getByLabelText("Vaše odpověď"), "too late")
    await user.click(screen.getByRole("button", { name: "Odeslat" }))

    expect(
      await screen.findByText("Na tohle už nejde odpovědět, bylo to smazáno."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Vaše odpověď")).toHaveValue("too late")
  })

  describe("Delete on replies", () => {
    const deleteButtonIn = async (text: string) => {
      const article = (await screen.findByText(text)).closest("article")!
      return within(article).queryAllByRole("button", { name: "Delete" })
    }

    beforeEach(() => {
      serverReplies["quacks/q1/replies"] = [reply("r1", 2), reply("r2", 3)]
    })

    it("offers a user Delete only on their own reply", async () => {
      renderItem(quack({ userId: "u9", user: aUser(9), replyCount: 2 }), { currentUserId: "u3" })
      await userEvent.setup().click(screen.getByRole("button", { name: "2 odpovědi" }))

      expect(await deleteButtonIn("text of r1")).toHaveLength(0)
      expect(await deleteButtonIn("text of r2")).toHaveLength(1)
    })

    it("offers a moderator Delete on every reply", async () => {
      renderItem(quack({ userId: "u9", user: aUser(9), replyCount: 2 }), {
        currentUserId: "admin",
        isModerator: true,
      })
      await userEvent.setup().click(screen.getByRole("button", { name: "2 odpovědi" }))

      expect(await deleteButtonIn("text of r1")).toHaveLength(1)
      expect(await deleteButtonIn("text of r2")).toHaveLength(1)
    })
  })
})
