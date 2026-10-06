import { useId, useRef } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { MAX_SEARCH_LENGTH } from "@/features/quack/components/searchTerm"

type QuackSearchProps = {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function QuackSearch({ value, onChange, className }: QuackSearchProps) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)

  const clear = () => {
    onChange("")
    inputRef.current?.focus()
  }

  return (
    <div
      role="search"
      className={cn("flex flex-col gap-2", className)}
    >
      <Label htmlFor={id}>Search quacks</Label>
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          type="text"
          autoComplete="off"
          placeholder="e.g. bread, or Bread Critic"
          maxLength={MAX_SEARCH_LENGTH}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-9"
        />
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear search"
            onClick={clear}
            className="absolute top-0 right-0"
          >
            <X />
          </Button>
        ) : null}
      </div>
    </div>
  )
}
