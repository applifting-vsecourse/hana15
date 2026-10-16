import { z } from "zod"

// Lives in lib/ because both the quack and auth (profile) features need it.
export const MOODS = ["happy", "sad", "angry", "silly"] as const

export const moodSchema = z.enum(MOODS)

export type Mood = z.infer<typeof moodSchema>

// Radix Select can't hold an empty value, so "no mood" needs a stand-in.
export const NO_MOOD = "none"

// One place for how a mood reads, so the form and the feed never disagree.
export const MOOD_DISPLAY: Record<Mood, { label: string; emoji: string }> = {
  happy: { label: "Happy", emoji: "😄" },
  sad: { label: "Sad", emoji: "😢" },
  angry: { label: "Angry", emoji: "😠" },
  silly: { label: "Silly", emoji: "🤪" },
}
