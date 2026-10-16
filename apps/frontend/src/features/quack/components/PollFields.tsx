import { Plus, X } from "lucide-react"
import { useFieldArray, type Control } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"

import { POLL_MAX_OPTIONS, POLL_MIN_OPTIONS } from "@/features/quack/api/quackSchemas"
import type { QuackFormValues } from "@/features/quack/components/QuackForm"

type PollFieldsProps = { control: Control<QuackFormValues>; isDisabled?: boolean }

export function PollFields({ control, isDisabled }: PollFieldsProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "pollOptions" })

  return (
    <div className="flex flex-col gap-3">
      {fields.map((field, index) => (
        <FormField
          key={field.id}
          control={control}
          name={`pollOptions.${index}.text`}
          render={({ field: input }) => (
            <FormItem>
              <FormLabel>Option {index + 1}</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input
                    placeholder="An answer to choose"
                    disabled={isDisabled}
                    {...input}
                  />
                </FormControl>
                {fields.length > POLL_MIN_OPTIONS ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove option ${index + 1}`}
                    disabled={isDisabled}
                    onClick={() => remove(index)}
                  >
                    <X className="size-4" />
                  </Button>
                ) : null}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      ))}

      {fields.length < POLL_MAX_OPTIONS ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={isDisabled}
          onClick={() => append({ text: "" })}
        >
          <Plus className="size-4" />
          Add option
        </Button>
      ) : null}
    </div>
  )
}
