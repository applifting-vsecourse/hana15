import "@testing-library/jest-dom/vitest"

import { vi } from "vitest"

// jsdom has no ResizeObserver, which Radix (Switch, Select) needs to mount.
globalThis.ResizeObserver ??= class {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
