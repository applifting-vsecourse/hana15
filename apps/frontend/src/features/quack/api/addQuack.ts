import { api } from "@/lib/api-client"
import type { Mood } from "@/lib/mood"

import { quackSchema, type Quack } from "@/features/quack/api/quackSchemas"

export async function addQuack(input: {
  text: string
  mood?: Mood
  pollOptions?: string[]
}): Promise<Quack> {
  const json = await api.post("quacks", { json: input }).json()
  return quackSchema.parse(json)
}
