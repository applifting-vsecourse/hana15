import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { HTTPError } from "@/lib/api-client"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { useAddReply } from "@/features/quack/hooks/useAddReply"

// Same limit as a quack (the server validates independently).
const MAX_LENGTH = 280

const GONE_MESSAGE = "Na tohle už nejde odpovědět, bylo to smazáno."
const FAILED_MESSAGE = "Odpověď se nepodařilo odeslat."

type ReplyFormProps = {
  // The quack or reply being answered.
  targetId: string
  // Gets the stored reply, so the list can bring it into view.
  onSent: (reply: Quack) => void
  onCancel: () => void
}

export function ReplyForm({ targetId, onSent, onCancel }: ReplyFormProps) {
  const addReply = useAddReply()
  const [text, setText] = useState("")
  const [validation, setValidation] = useState<string | null>(null)
  const inputId = `reply-${targetId}`

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = text.trim()
    if (trimmed.length === 0) {
      setValidation("Napište odpověď.")
      return
    }
    if (trimmed.length > MAX_LENGTH) {
      setValidation(`Odpověď může mít nejvýše ${MAX_LENGTH} znaků.`)
      return
    }
    setValidation(null)
    // On failure the text stays in the field; only success empties and closes.
    addReply.mutate(
      { targetId, text: trimmed },
      {
        onSuccess: (reply) => {
          setText("")
          onSent(reply)
        },
      },
    )
  }

  const serverError = addReply.error
    ? addReply.error instanceof HTTPError && addReply.error.response.status === 404
      ? GONE_MESSAGE
      : FAILED_MESSAGE
    : null
  const message = validation ?? serverError

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className="flex flex-col gap-2"
    >
      <Label htmlFor={inputId}>Vaše odpověď</Label>
      <Textarea
        id={inputId}
        rows={2}
        value={text}
        disabled={addReply.isPending}
        aria-invalid={message ? true : undefined}
        onChange={(event) => setText(event.target.value)}
      />
      {message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={addReply.isPending}
          onClick={onCancel}
        >
          Zrušit
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={addReply.isPending}
        >
          {addReply.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          Odeslat
        </Button>
      </div>
    </form>
  )
}
