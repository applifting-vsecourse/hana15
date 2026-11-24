import { Heart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { useLikeQuack } from "@/features/quack/hooks/useLikeQuack"

// Not rendered for a placeholder row: it has no count (ADR 0002).
export function LikeButton({ quack }: { quack: Quack }) {
  const like = useLikeQuack(quack.id)
  const isLiked = quack.likedByMe ?? false

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-label="Líbí se mi"
      aria-pressed={isLiked}
      disabled={like.isPending}
      onClick={() => like.mutate({ isLiked: !isLiked })}
    >
      <Heart className={cn(isLiked && "fill-current text-primary")} />
      {quack.likeCount ?? 0}
    </Button>
  )
}
