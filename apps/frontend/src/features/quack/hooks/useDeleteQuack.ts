import { useMutation, useQueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/lib/quack-keys"

import { deleteQuack } from "@/features/quack/api/deleteQuack"

export function useDeleteQuack() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteQuack,
    onSuccess: () => {
      // Not returned: the dialog shouldn't wait for the list to reload.
      void queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
