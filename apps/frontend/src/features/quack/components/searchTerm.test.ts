import { describe, expect, it } from "vitest"

import { toSearchTerm } from "@/features/quack/components/searchTerm"

describe("toSearchTerm", () => {
  it.each(["", "   ", "a", "  a  "])("isn't a search below 2 characters (%j)", (input) => {
    expect(toSearchTerm(input)).toBeUndefined()
  })

  it("trims the input", () => {
    expect(toSearchTerm("  bread pond ")).toBe("bread pond")
  })

  it("counts 2 characters as a search", () => {
    expect(toSearchTerm("ab")).toBe("ab")
  })
})
