import { api } from "@/lib/api-client"

import { pollSchema, type Poll } from "@/features/quack/api/quackSchemas"

export async function votePoll(input: { quackId: string; optionId: string }): Promise<Poll> {
  const json = await api
    .post(`quacks/${input.quackId}/vote`, { json: { optionId: input.optionId } })
    .json()
  return pollSchema.parse(json)
}
