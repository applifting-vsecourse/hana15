import { useMutation, useQueryClient } from "@tanstack/react-query"

import { authKeys } from "@/lib/auth-keys"
import type { Mood } from "@/lib/mood"
import { quackKeys } from "@/lib/quack-keys"

import { authClient } from "@/features/auth/lib/auth-client"

export type ProfileInput = {
  username: string
  name: string
  bio: string | null
  defaultMood: Mood | null
}

// Carries better-auth's error code so the form can tell "username taken"
// (a field error) from everything else (a form-level alert).
export class UpdateProfileError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message)
  }
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ProfileInput) => {
      const { error } = await authClient.updateUser(input)
      if (error) throw new UpdateProfileError(error.message ?? "Saving failed", error.code)
    },
    onSuccess: async () => {
      // The session feeds the header and the form; the feed shows the author.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.session() }),
        queryClient.invalidateQueries({ queryKey: quackKeys.all() }),
      ])
    },
  })
}
