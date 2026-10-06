import { useRef, useState } from "react"
import { Smile } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// A short curated set rather than the full Unicode catalogue — enough for a
// quack, with no emoji data to download.
const EMOJIS = [
  "😀",
  "😂",
  "😍",
  "😎",
  "🤔",
  "😴",
  "😭",
  "😡",
  "👍",
  "👎",
  "👏",
  "🙌",
  "🙏",
  "💪",
  "👀",
  "🤝",
  "❤️",
  "🔥",
  "✨",
  "🎉",
  "💯",
  "✅",
  "❌",
  "💡",
  "🦆",
  "🐣",
  "🌊",
  "☀️",
  "🌧️",
  "🍞",
  "☕",
  "🍕",
]

type EmojiPickerProps = {
  onSelect: (emoji: string) => void
  isDisabled?: boolean
}

export function EmojiPicker({ onSelect, isDisabled }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  // After a pick, focus belongs back in the text (the caller moves it there),
  // not on the trigger where Radix would normally return it.
  const didPick = useRef(false)

  return (
    <Popover
      open={isOpen}
      onOpenChange={setIsOpen}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Add emoji"
          disabled={isDisabled}
        >
          <Smile className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-auto p-2"
        onCloseAutoFocus={(event) => {
          if (didPick.current) event.preventDefault()
          didPick.current = false
        }}
      >
        <div className="grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <Button
              key={emoji}
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Insert ${emoji}`}
              className="text-lg"
              onClick={() => {
                didPick.current = true
                setIsOpen(false)
                onSelect(emoji)
              }}
            >
              {emoji}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
