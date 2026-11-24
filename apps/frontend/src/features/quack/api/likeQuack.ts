import { z } from "zod"

import { api } from "@/lib/api-client"

const likeStateSchema = z.object({ likeCount: z.number(), likedByMe: z.boolean() })

export type LikeState = z.infer<typeof likeStateSchema>

// PUT likes, DELETE takes the like back; both answer with the current state.
export async function setLike(input: { quackId: string; isLiked: boolean }): Promise<LikeState> {
  const url = `quacks/${input.quackId}/like`
  const json = await (input.isLiked ? api.put(url) : api.delete(url)).json()
  return likeStateSchema.parse(json)
}
