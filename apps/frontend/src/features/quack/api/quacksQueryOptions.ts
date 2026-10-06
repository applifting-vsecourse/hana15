import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"

import { quackKeys } from "@/features/quack/api/quackKeys"
import { quacksSchema } from "@/features/quack/api/quackSchemas"

// `search` is sent as-is; deciding whether input counts as a search is the
// caller's job (see toSearchTerm).
export const quacksQueryOptions = (search?: string) =>
  queryOptions({
    queryKey: quackKeys.list(search),
    queryFn: async () =>
      quacksSchema.parse(
        await api.get("quacks", { searchParams: search ? { q: search } : undefined }).json(),
      ),
  })
