import { z } from "zod"

import { moodSchema } from "@/lib/mood"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.

export const quackUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  username: z.string(),
})

export const POLL_MIN_OPTIONS = 2
export const POLL_MAX_OPTIONS = 5
export const POLL_OPTION_MAX_LENGTH = 60

export const pollSchema = z.object({
  options: z.array(z.object({ id: z.string(), text: z.string(), votes: z.number() })),
  // The signed-in user's own vote, if any.
  myOptionId: z.string().nullable(),
})

export type Poll = z.infer<typeof pollSchema>

export const quackSchema = z.object({
  id: z.string(),
  // A deleted quack that others replied to stays as a placeholder: the server
  // sends no text, mood, poll or author for it.
  deleted: z.boolean(),
  text: z.string().nullable(),
  mood: moodSchema.nullable(),
  userId: z.string().nullable(),
  createdAt: z.coerce.date(),
  user: quackUserSchema.nullable(),
  poll: pollSchema.nullable(),
  // Replies are quacks too: a root quack has threadId and replyToId null.
  threadId: z.string().nullable(),
  replyToId: z.string().nullable(),
  // Set only when answering another reply (the "v odpovědi na" line).
  replyToUser: quackUserSchema.nullable(),
  // The reply it answers was deleted.
  replyToDeleted: z.boolean(),
  replyCount: z.number(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
