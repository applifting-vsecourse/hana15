// Mirrors the server: shorter searches show the full feed.
export const MIN_SEARCH_LENGTH = 2

// Mirrors the server-side DTO (MaxLength(280)).
export const MAX_SEARCH_LENGTH = 280

// The term to send to the API, or undefined when the input isn't a search yet.
export function toSearchTerm(input: string): string | undefined {
  const term = input.trim()
  return term.length >= MIN_SEARCH_LENGTH ? term : undefined
}
