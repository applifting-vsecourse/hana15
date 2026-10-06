import { useState } from "react"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"
import { useDebouncedValue } from "@/hooks/useDebouncedValue"

import { quacksQueryOptions } from "@/features/quack/api/quacksQueryOptions"
import { QuackForm } from "@/features/quack/components/QuackForm"
import { QuackList } from "@/features/quack/components/QuackList"
import { QuackSearch } from "@/features/quack/components/QuackSearch"
import { toSearchTerm } from "@/features/quack/components/searchTerm"

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

  const quacksQuery = useQuery({
    ...quacksQueryOptions(searchTerm),
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
