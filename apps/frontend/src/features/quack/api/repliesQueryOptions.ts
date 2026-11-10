import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { quackKeys } from "@/lib/quack-keys"

import { quacksSchema } from "@/features/quack/api/quackSchemas"

export const repliesQueryOptions = (quackId: string) =>
  queryOptions({
    queryKey: quackKeys.replies(quackId),
    queryFn: async () => quacksSchema.parse(await api.get(`quacks/${quackId}/replies`).json()),
  })
