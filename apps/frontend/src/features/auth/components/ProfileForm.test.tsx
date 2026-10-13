import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { authClient } from "@/features/auth/lib/auth-client"

vi.mock("@/features/auth/lib/auth-client", () => ({
  authClient: { updateUser: vi.fn() },
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))

const user: SessionUser = {
  id: "u1",
  email: "a@b.cz",
  name: "Anna",
  username: "anna",
  bio: null,
  defaultMood: null,
}

const updateUser = vi.mocked(authClient.updateUser)

function renderForm() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ProfileForm user={user} />
    </QueryClientProvider>,
  )
}

describe("ProfileForm", () => {
  beforeEach(() => updateUser.mockReset())

  it("starts with the current username", () => {
    renderForm()

    expect(screen.getByLabelText("Username")).toHaveValue("anna")
  })

  it("rejects a username with invalid characters without calling the server", async () => {
    renderForm()

    const input = screen.getByLabelText("Username")
    await userEvent.clear(input)
    await userEvent.type(input, "bad name!")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(
      await screen.findByText("Only letters, digits, dots and underscores"),
    ).toBeInTheDocument()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it("shows a taken username next to the field and keeps what was typed", async () => {
    updateUser.mockResolvedValue({
      data: null,
      error: { code: "USERNAME_IS_ALREADY_TAKEN", message: "taken", status: 400, statusText: "" },
    })
    renderForm()

    const input = screen.getByLabelText("Username")
    await userEvent.clear(input)
    await userEvent.type(input, "duck")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(await screen.findByText("This username is already taken")).toBeInTheDocument()
    expect(input).toHaveValue("duck")
  })

  it("discards changes back to the saved values", async () => {
    renderForm()

    const input = screen.getByLabelText("Username")
    await userEvent.type(input, "_x")
    await userEvent.click(screen.getByRole("button", { name: "Discard changes" }))

    await waitFor(() => expect(input).toHaveValue("anna"))
  })
})
