import { defineConfig } from "@playwright/test"

// Runs against the app from `pnpm dev` (seeded accounts); it does not start one.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3060" },
})
