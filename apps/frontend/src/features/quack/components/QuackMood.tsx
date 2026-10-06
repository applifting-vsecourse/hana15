import type { Mood } from "@/features/quack/api/quackSchemas"
import { MOOD_DISPLAY } from "@/features/quack/components/moods"

type QuackMoodProps = { mood: Mood }

export function QuackMood({ mood }: QuackMoodProps) {
  const { label, emoji } = MOOD_DISPLAY[mood]

  return (
    <span className="text-xs text-muted-foreground">
      <span aria-hidden="true">{emoji}</span> {label}
    </span>
  )
}
