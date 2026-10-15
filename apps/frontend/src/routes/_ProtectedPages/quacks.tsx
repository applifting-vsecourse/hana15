import { useState } from "react"
import { keepPreviousData, useIsMutating, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { toSearchTerm } from "@/features/quack/components/searchTerm"
import { VOTE_MUTATION_KEY } from "@/features/quack/hooks/useVotePoll"

// How often other people's votes show up without a reload.
const POLL_REFETCH_MS = 5000

// Wait for a pause in typing so every keystroke isn't a request.
const SEARCH_DEBOUNCE_MS = 300

export const Route = createFileRoute("/_ProtectedPages/quacks")({
  component: QuacksPage,
})

function QuacksPage() {
  // Plain component state on purpose: the search resets on reload and isn't
  // part of the URL.
  const [searchInput, setSearchInput] = useState("")
  const searchTerm = toSearchTerm(useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS))

  // Don't refetch while a vote is in flight: the answer would be older than
  // the numbers the user has just clicked into place.
  const isVoting = useIsMutating({ mutationKey: VOTE_MUTATION_KEY }) > 0

  const quacksQuery = useQuery({
    ...quacksQueryOptions(searchTerm),
    refetchInterval: isVoting ? false : POLL_REFETCH_MS,
    // Keep showing the current list while the next search loads, instead of
    // flashing a spinner after every pause in typing.
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <Seo title="Quacks" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-4 text-2xl font-semibold tracking-tight">Quacks</h1>

        <QuackSearch
          value={searchInput}
          onChange={setSearchInput}
          className="mb-6"
        />

        {/* Hidden while searching: a new quack that doesn't match the search
            would otherwise seem to vanish after posting. */}
        {searchTerm ? null : <QuackForm className="mb-4" />}

        <QuackList
          quacks={quacksQuery.data ?? []}
          isLoading={quacksQuery.isLoading}
          error={quacksQuery.error ?? undefined}
          // Only the error state offers a retry — posting invalidates the list,
          // and refocusing the tab refetches it.
          onReload={() => void quacksQuery.refetch()}
          emptyMessage={searchTerm ? `No quacks match “${searchTerm}”` : undefined}
        />
      </section>
    </>
  )
}
