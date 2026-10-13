import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { ProfileForm } from "@/features/auth/components/ProfileForm"
import { useSession } from "@/features/auth/hooks/useSession"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const { user } = useSession()

  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-2xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>
        {/* The protected layout guarantees a session; this only narrows the type. */}
        {user ? <ProfileForm user={user} /> : null}
      </section>
    </>
  )
}
