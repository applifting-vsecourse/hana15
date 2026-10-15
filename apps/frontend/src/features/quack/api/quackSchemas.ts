import { z } from "zod"

// Per the Applifting frontend playbook: validate every server payload with zod
// and infer types from the schema rather than auto-generating them.
export const MOODS = ["happy", "sad", "angry", "silly"] as const

export const moodSchema = z.enum(MOODS)

export type Mood = z.infer<typeof moodSchema>

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
  text: z.string(),
  mood: moodSchema.nullable(),
  userId: z.string(),
  createdAt: z.coerce.date(),
  user: quackUserSchema,
  poll: pollSchema.nullable(),
})

export const quacksSchema = z.array(quackSchema)

export type Quack = z.infer<typeof quackSchema>
