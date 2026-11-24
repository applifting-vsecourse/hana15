import { useMutation, useQueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/lib/quack-keys"

import { setLike, type LikeState } from "@/features/quack/api/likeQuack"
import type { Quack } from "@/features/quack/api/quackSchemas"

// Feed lists and reply lists are all arrays of quacks under the same root key.
export function useLikeQuack(quackId: string) {
  const queryClient = useQueryClient()

  const patch = (update: (quack: Quack) => Quack) =>
    queryClient.setQueriesData<Quack[]>({ queryKey: quackKeys.all() }, (quacks) =>
      quacks?.map((quack) => (quack.id === quackId ? update(quack) : quack)),
    )
  const apply = (state: LikeState) => patch((quack) => ({ ...quack, ...state }))

  return useMutation({
    mutationKey: ["quacks", "like", quackId],
    mutationFn: ({ isLiked }: { isLiked: boolean }) => setLike({ quackId, isLiked }),
    onMutate: async ({ isLiked }) => {
      await queryClient.cancelQueries({ queryKey: quackKeys.all() })
      const previous = queryClient.getQueriesData<Quack[]>({ queryKey: quackKeys.all() })
      patch((quack) => ({
        ...quack,
        likedByMe: isLiked,
        likeCount: Math.max(0, (quack.likeCount ?? 0) + (isLiked ? 1 : -1)),
      }))
      return { previous }
    },
    onError: (_error, _variables, context) => {
      // Put back exactly what was shown before the click.
      context?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
    },
    onSuccess: apply,
    onSettled: () => {
      // Not returned: a failed save must show without waiting for the reload.
      void queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
