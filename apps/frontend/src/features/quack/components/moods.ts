import type { Mood } from "@/features/quack/api/quackSchemas"

// One place for how a mood reads, so the form and the feed never disagree.
export const MOOD_DISPLAY: Record<Mood, { label: string; emoji: string }> = {
  happy: { label: "Happy", emoji: "😄" },
  sad: { label: "Sad", emoji: "😢" },
  angry: { label: "Angry", emoji: "😠" },
  silly: { label: "Silly", emoji: "🤪" },
}
