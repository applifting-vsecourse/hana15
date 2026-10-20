import { useRef, type RefObject } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { MOOD_DISPLAY, MOODS, NO_MOOD, type Mood } from "@/lib/mood"
import { cn } from "@/lib/utils"

import { POLL_OPTION_MAX_LENGTH } from "@/features/quack/api/quackSchemas"
import { EmojiPicker } from "@/features/quack/components/EmojiPicker"
import { PollFields } from "@/features/quack/components/PollFields"
import { useAddQuack } from "@/features/quack/hooks/useAddQuack"

// Mirrors the server-side DTO (MaxLength(280)) so the user is told before
// the request is made — the server still validates independently.
const MAX_LENGTH = 280

const schema = z
  .object({
    text: z
      .string()
      .trim()
      .min(1, "Write something first")
      .max(MAX_LENGTH, `Keep it under ${MAX_LENGTH} characters`),
    mood: z.enum([NO_MOOD, ...MOODS]),
    hasPoll: z.boolean(),
    pollOptions: z.array(z.object({ text: z.string() })),
  })
  .superRefine((values, ctx) => {
    // Options only matter while the poll switch is on.
    if (!values.hasPoll) return

    const firstSeenAt = new Map<string, number>()
    values.pollOptions.forEach(({ text }, index) => {
      const option = text.trim()
      const key = option.toLowerCase()
      const issue = (message: string) =>
        ctx.addIssue({ code: "custom", message, path: ["pollOptions", index, "text"] })

      if (option.length === 0) return issue("Write an answer or remove this option")
      if (option.length > POLL_OPTION_MAX_LENGTH) {
        return issue(`Keep it under ${POLL_OPTION_MAX_LENGTH} characters`)
      }
      const firstIndex = firstSeenAt.get(key)
      if (firstIndex !== undefined) return issue(`Same as option ${firstIndex + 1}`)
      firstSeenAt.set(key, index)
    })
  })

export type QuackFormValues = z.infer<typeof schema>
type FormValues = QuackFormValues

const emptyOptions = () => [{ text: "" }, { text: "" }]

type QuackFormProps = {
  className?: string
  // The user's saved preference; the form starts (and resets) with it selected.
  defaultMood?: Mood | null
  textareaRef?: RefObject<HTMLTextAreaElement | null>
}

export function QuackForm({ className, defaultMood, textareaRef: externalRef }: QuackFormProps) {
  const addQuack = useAddQuack()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      text: "",
      mood: defaultMood ?? NO_MOOD,
      hasPoll: false,
      pollOptions: emptyOptions(),
    },
  })

  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const text = useWatch({ control: form.control, name: "text" })
  const length = text?.length ?? 0
  const hasPoll = useWatch({ control: form.control, name: "hasPoll" })

  // Insert at the caret (replacing any selection), then put the caret after
  // the emoji so the user can keep typing.
  const insertEmoji = (emoji: string) => {
    const current = form.getValues("text")
    const textarea = textareaRef.current
    const start = textarea?.selectionStart ?? current.length
    const end = textarea?.selectionEnd ?? current.length
    form.setValue("text", current.slice(0, start) + emoji + current.slice(end), {
      shouldDirty: true,
      shouldValidate: form.formState.isSubmitted,
    })
    requestAnimationFrame(() => {
      const caret = start + emoji.length
      textarea?.focus()
      textarea?.setSelectionRange(caret, caret)
    })
  }

  const handleSubmit = (values: FormValues) => {
    const mood = values.mood === NO_MOOD ? undefined : values.mood
    const pollOptions = values.hasPoll
      ? values.pollOptions.map((option) => option.text.trim())
      : undefined
    addQuack.mutate({ text: values.text, mood, pollOptions }, { onSuccess: () => form.reset() })
  }

  return (
    <Form {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={cn("space-y-3", className)}
      >
        {addQuack.error ? (
          <Alert variant="destructive">
            <AlertDescription>{addQuack.error.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>{hasPoll ? "Question" : "New quack"}</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    placeholder="Quack something..."
                    disabled={addQuack.isPending}
                    {...field}
                    ref={(element) => {
                      field.ref(element)
                      textareaRef.current = element
                      if (externalRef) externalRef.current = element
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="mood"
            render={({ field }) => (
              <FormItem className="sm:w-36">
                <FormLabel>Mood</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={addQuack.isPending}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
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
        </div>

        {hasPoll ? (
          <PollFields
            control={form.control}
            isDisabled={addQuack.isPending}
          />
        ) : null}

        <div className="flex items-center gap-3">
          <EmojiPicker
            onSelect={insertEmoji}
            isDisabled={addQuack.isPending}
          />
          <FormField
            control={form.control}
            name="hasPoll"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={addQuack.isPending}
                  />
                </FormControl>
                <FormLabel>Add poll</FormLabel>
              </FormItem>
            )}
          />
          <span
            // Pushes the counter and submit button to the right.
            aria-hidden="true"
            className="flex-1"
          />
          <span
            className={cn(
              "text-sm",
              length > MAX_LENGTH ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {length}/{MAX_LENGTH}
          </span>
          <Button
            type="submit"
            size="sm"
            disabled={addQuack.isPending}
          >
            {addQuack.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Quack
          </Button>
        </div>
      </form>
    </Form>
  )
}
