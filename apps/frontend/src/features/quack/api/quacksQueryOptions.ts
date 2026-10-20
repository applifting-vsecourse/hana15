import { queryOptions } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { quackKeys } from "@/lib/quack-keys"

import { quacksSchema } from "@/features/quack/api/quackSchemas"

// `search` is sent as-is; deciding whether input counts as a search is the
// caller's job (see toSearchTerm).
export const quacksQueryOptions = (search?: string, isMine?: boolean) =>
  queryOptions({
    queryKey: quackKeys.list(search, isMine),
    queryFn: async () =>
      quacksSchema.parse(
        await api
          .get("quacks", {
            // "Mine" carries no user id: the server resolves it from the session.
            searchParams: { ...(search ? { q: search } : {}), ...(isMine ? { mine: true } : {}) },
          })
          .json(),
      ),
  })
