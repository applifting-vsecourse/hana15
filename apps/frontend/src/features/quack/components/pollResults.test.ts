import { describe, expect, it } from "vitest"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { percentOf, totalVotes, withVote } from "@/features/quack/components/pollResults"

const poll = (myOptionId: string | null, votes: [number, number] = [2, 1]): Poll => ({
  myOptionId,
  options: [
    { id: "a", text: "Thai", votes: votes[0] },
    { id: "b", text: "Pizza", votes: votes[1] },
  ],
})

describe("pollResults", () => {
  it("sums the votes of all options", () => {
    expect(totalVotes(poll(null))).toBe(3)
  })

  it("rounds shares to whole percent and never divides by zero", () => {
    expect(percentOf(1, 3)).toBe(33)
    expect(percentOf(2, 3)).toBe(67)
    expect(percentOf(0, 0)).toBe(0)
  })

  it("adds a first vote to the chosen option", () => {
    const next = withVote(poll(null), "b")

    expect(next.myOptionId).toBe("b")
    expect(next.options.map((option) => option.votes)).toEqual([2, 2])
  })

  it("moves an existing vote: old option loses one, new option gains one", () => {
    const next = withVote(poll("a"), "b")

    expect(next.myOptionId).toBe("b")
    expect(next.options.map((option) => option.votes)).toEqual([1, 2])
  })

  it("leaves the poll unchanged when the user clicks their current choice", () => {
    const current = poll("a")

    expect(withVote(current, "a")).toBe(current)
  })

  it("does not mutate the poll it was given", () => {
    const current = poll("a")
    withVote(current, "b")

    expect(current.options.map((option) => option.votes)).toEqual([2, 1])
  })
})
