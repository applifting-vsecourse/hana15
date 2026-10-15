import { useMutation, useQueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/features/quack/api/quackKeys"
import type { Poll, Quack } from "@/features/quack/api/quackSchemas"
import { votePoll } from "@/features/quack/api/votePoll"
import { withVote } from "@/features/quack/components/pollResults"

// Lets the feed's polling see that a vote is in flight, so a refetch can't
// overwrite the optimistic numbers with older ones.
export const VOTE_MUTATION_KEY = ["quacks", "vote"] as const

// One hook per poll: each poll keeps its own error, so a failed vote shows
// its message under the right poll.
export function useVotePoll(quackId: string) {
  const queryClient = useQueryClient()

  const setPoll = (update: (poll: Poll) => Poll) =>
    queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.lists() }, (quacks) =>
      quacks?.map((quack) =>
        quack.id === quackId && quack.poll ? { ...quack, poll: update(quack.poll) } : quack,
      ),
    )

  return useMutation({
    mutationKey: VOTE_MUTATION_KEY,
    mutationFn: (optionId: string) => votePoll({ quackId, optionId }),
    onMutate: async (optionId) => {
      await queryClient.cancelQueries({ queryKey: quackKeys.lists() })
      const previous = queryClient.getQueriesData<Quack[]>({ queryKey: quackKeys.lists() })
      setPoll((poll) => withVote(poll, optionId))
      return { previous }
    },
    onError: (_error, _optionId, context) => {
      // Put back exactly what was shown before the click.
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSuccess: (poll) => setPoll(() => poll),
    onSettled: () => queryClient.invalidateQueries({ queryKey: quackKeys.lists() }),
  })
}
