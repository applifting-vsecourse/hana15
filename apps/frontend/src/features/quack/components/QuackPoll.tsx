import { Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Poll } from "@/features/quack/api/quackSchemas"
import { percentOf, totalVotes } from "@/features/quack/components/pollResults"
import { useVotePoll } from "@/features/quack/hooks/useVotePoll"

type QuackPollProps = { quackId: string; poll: Poll }

export function QuackPoll({ quackId, poll }: QuackPollProps) {
  const vote = useVotePoll(quackId)
  const total = totalVotes(poll)

  const handleVote = (optionId: string) => {
    // Clicking your current choice does nothing: votes can move, not be withdrawn.
    if (optionId === poll.myOptionId) return
    vote.mutate(optionId)
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {poll.options.map((option) => {
          const isSelected = option.id === poll.myOptionId
          const percent = percentOf(option.votes, total)
          return (
            <li key={option.id}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => handleVote(option.id)}
                className={cn(
                  "relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                  isSelected ? "border-primary font-medium" : "border-border",
                )}
              >
                {total > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 bg-secondary"
                    style={{ width: `${percent}%` }}
                  />
                ) : null}
                <span className="relative flex items-center gap-2 break-words">
                  {isSelected ? (
                    <Check
                      className="size-4"
                      aria-hidden="true"
                    />
                  ) : null}
                  {option.text}
                </span>
                <span className="relative shrink-0 text-muted-foreground">
                  {total > 0 ? `${option.votes} · ${percent} %` : option.votes}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        {total === 0 ? "Be the first to vote" : `${total} ${total === 1 ? "vote" : "votes"}`}
      </p>

      {vote.isError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 text-sm text-destructive"
        >
          <span>Your vote wasn&apos;t saved.</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => vote.mutate(vote.variables)}
          >
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  )
}
