import { useMutation, useQueryClient } from "@tanstack/react-query"

import { quackKeys } from "@/lib/quack-keys"

import { addReply } from "@/features/quack/api/addReply"

export function useAddReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addReply,
    onSuccess: () => {
      // Not returned: the form closes without waiting for the reload. The feed
      // (reply count) and every open reply list refresh.
      void queryClient.invalidateQueries({ queryKey: quackKeys.all() })
    },
  })
}
