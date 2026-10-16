import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { MOOD_DISPLAY, MOODS, NO_MOOD } from "@/lib/mood"
import { cn } from "@/lib/utils"

import type { SessionUser } from "@/features/auth/api/authSessionQueryOptions"
import { UpdateProfileError, useUpdateProfile } from "@/features/auth/hooks/useUpdateProfile"

// Mirror the server-side rules so the user is told before the request is
// made — the server still validates independently.
const USERNAME_MIN = 3
const USERNAME_MAX = 30
const BIO_MAX = 160

const schema = z.object({
  username: z
    .string()
    .trim()
    .min(USERNAME_MIN, `At least ${USERNAME_MIN} characters`)
    .max(USERNAME_MAX, `At most ${USERNAME_MAX} characters`)
    .regex(/^[A-Za-z0-9._]+$/, "Only letters, digits, dots and underscores"),
  name: z.string().trim().min(1, "Display name is required"),
  bio: z.string().max(BIO_MAX, `Keep it under ${BIO_MAX} characters`),
  defaultMood: z.enum([NO_MOOD, ...MOODS]),
})

type FormValues = z.infer<typeof schema>

const toFormValues = (user: SessionUser): FormValues => ({
  username: user.username,
  name: user.name,
  bio: user.bio ?? "",
  defaultMood: user.defaultMood ?? NO_MOOD,
})

type ProfileFormProps = { user: SessionUser }

export function ProfileForm({ user }: ProfileFormProps) {
  const updateProfile = useUpdateProfile()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: toFormValues(user),
  })

  const bio = useWatch({ control: form.control, name: "bio" })

  const handleSubmit = (values: FormValues) => {
    const username = values.username.trim()
    const name = values.name.trim()
    updateProfile.mutate(
      {
        username,
        name,
        bio: values.bio.trim() || null,
        defaultMood: values.defaultMood === NO_MOOD ? null : values.defaultMood,
      },
      {
        onSuccess: () => {
          // The saved values become the new baseline for "Discard".
          form.reset({ ...values, username, name, bio: values.bio.trim() })
          toast.success("Settings saved")
        },
        onError: (error) => {
          // Keep what the user typed; just say what's wrong next to the field.
          if (error instanceof UpdateProfileError && error.code === "USERNAME_IS_ALREADY_TAKEN") {
            form.setError("username", { message: "This username is already taken" })
          }
        },
      },
    )
  }

  const error = updateProfile.error
  const isUsernameTaken =
    error instanceof UpdateProfileError && error.code === "USERNAME_IS_ALREADY_TAKEN"

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6"
      >
        {error && !isUsernameTaken ? (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input
                  autoComplete="username"
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                {USERNAME_MIN}–{USERNAME_MAX} characters: letters, digits, dots and underscores.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input
                  autoComplete="name"
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  disabled={updateProfile.isPending}
                  {...field}
                />
              </FormControl>
              <div className="flex items-start justify-between gap-3">
                <FormMessage />
                <span
                  className={cn(
                    "ml-auto text-sm",
                    (bio?.length ?? 0) > BIO_MAX ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {bio?.length ?? 0}/{BIO_MAX}
                </span>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="defaultMood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Default mood for new quacks</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={updateProfile.isPending}
              >
                <FormControl>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={NO_MOOD}>No mood</SelectItem>
                  {MOODS.map((mood) => (
                    <SelectItem
                      key={mood}
                      value={mood}
                    >
                      <span aria-hidden="true">{MOOD_DISPLAY[mood].emoji}</span>
                      {MOOD_DISPLAY[mood].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={updateProfile.isPending || !form.formState.isDirty}
            onClick={() => {
              form.reset()
              updateProfile.reset()
            }}
          >
            Discard changes
          </Button>
        </div>
      </form>
    </Form>
  )
}
