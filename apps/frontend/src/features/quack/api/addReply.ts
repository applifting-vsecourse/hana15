import { api } from "@/lib/api-client"

import { quackSchema, type Quack } from "@/features/quack/api/quackSchemas"

// `targetId` is the quack or reply being answered; the server decides the thread.
export async function addReply(input: { targetId: string; text: string }): Promise<Quack> {
  const json = await api
    .post(`quacks/${input.targetId}/replies`, { json: { text: input.text } })
    .json()
  return quackSchema.parse(json)
}
