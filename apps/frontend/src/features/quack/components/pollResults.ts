import type { Poll } from "@/features/quack/api/quackSchemas"

export const totalVotes = (poll: Poll): number =>
  poll.options.reduce((sum, option) => sum + option.votes, 0)

// Whole-number share of all votes; only meaningful once somebody has voted.
export const percentOf = (votes: number, total: number): number =>
  total === 0 ? 0 : Math.round((votes / total) * 100)

// What the poll looks like right after the user clicks `optionId`, before the
// server has answered: their old vote (if any) moves to the new option.
export function withVote(poll: Poll, optionId: string): Poll {
  if (poll.myOptionId === optionId) return poll
  return {
    myOptionId: optionId,
    options: poll.options.map((option) => {
      if (option.id === optionId) return { ...option, votes: option.votes + 1 }
      if (option.id === poll.myOptionId) return { ...option, votes: option.votes - 1 }
      return option
    }),
  }
}
