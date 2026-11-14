import { useEffect, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { repliesQueryOptions } from "@/features/quack/api/repliesQueryOptions"
import { DeleteQuackButton } from "@/features/quack/components/DeleteQuackButton"
import { replyCountLabel } from "@/features/quack/components/replyCount"
import { ReplyForm } from "@/features/quack/components/ReplyForm"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackRepliesProps = {
  quack: Quack
  currentUserId?: string
  isModerator?: boolean
  // The quack's own delete button, shown next to its reply actions.
  canDelete?: boolean
  canReply?: boolean
}

// Reply actions and the flat list of replies under one root quack.
export function QuackReplies({
  quack,
  currentUserId,
  isModerator,
  canDelete,
  canReply = true,
}: QuackRepliesProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  // Which quack or reply the open form answers (one form at a time).
  const [replyingToId, setReplyingToId] = useState<string | null>(null)

  const repliesQuery = useQuery({ ...repliesQueryOptions(quack.id), enabled: isExpanded })
  const replies = repliesQuery.data ?? []

  // The reply to scroll to once it shows up in the list (it is appended at
  // the end, which can be far below the form the user just used).
  const [scrollToId, setScrollToId] = useState<string | null>(null)

  const sent = (reply: Quack) => {
    setReplyingToId(null)
    setIsExpanded(true)
    setScrollToId(reply.id)
  }

  if (!canReply) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {quack.deleted ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setReplyingToId(replyingToId === quack.id ? null : quack.id)}
            >
              Odpovědět
            </Button>
          )}
          {quack.replyCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {replyCountLabel(quack.replyCount)}
            </Button>
          ) : null}
        </div>
        {canDelete && !quack.deleted ? <DeleteQuackButton quackId={quack.id} /> : null}
      </div>

      {replyingToId === quack.id ? (
        <ReplyForm
          targetId={quack.id}
          onSent={sent}
          onCancel={() => setReplyingToId(null)}
        />
      ) : null}

      {isExpanded ? (
        <div className="flex flex-col gap-3 border-t border-border pt-3">
          {repliesQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Načítám odpovědi…</p>
          ) : null}
          {repliesQuery.error ? (
            <div className="flex items-center gap-2 text-sm">
              <span>Odpovědi se nepodařilo načíst.</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void repliesQuery.refetch()}
              >
                Zkusit znovu
              </Button>
            </div>
          ) : null}
          {replies.map((reply) => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              canDelete={isModerator === true || currentUserId === reply.userId}
              isReplying={replyingToId === reply.id}
              onToggleReply={() => setReplyingToId(replyingToId === reply.id ? null : reply.id)}
              onSent={sent}
              shouldScrollTo={scrollToId === reply.id}
              onScrolled={() => setScrollToId(null)}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

type ReplyItemProps = {
  reply: Quack
  canDelete: boolean
  isReplying: boolean
  onToggleReply: () => void
  onSent: (reply: Quack) => void
  shouldScrollTo: boolean
  onScrolled: () => void
}

function ReplyItem({
  reply,
  canDelete,
  isReplying,
  onToggleReply,
  onSent,
  shouldScrollTo,
  onScrolled,
}: ReplyItemProps) {
  const ref = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!shouldScrollTo) return
    // "nearest": scroll only as far as needed, and not at all if already visible.
    ref.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" })
    onScrolled()
  }, [shouldScrollTo, onScrolled])

  if (reply.deleted || !reply.user) {
    return (
      <article
        ref={ref}
        className="flex flex-col gap-1"
      >
        <p className="text-sm text-muted-foreground">Odpověď byla smazána</p>
      </article>
    )
  }

  const initials = reply.user.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article
      ref={ref}
      className="flex gap-3"
    >
      <Avatar className="size-8">
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName name={reply.user.name} /> <UsersUserName username={reply.user.username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(reply.createdAt)}</time>
        </div>
        {reply.replyToDeleted ? (
          <p className="text-xs text-muted-foreground">v odpovědi na smazanou odpověď</p>
        ) : reply.replyToUser ? (
          <p className="text-xs text-muted-foreground">
            v odpovědi na @{reply.replyToUser.username}
          </p>
        ) : null}
        <p className="text-sm break-words whitespace-pre-line">{reply.text}</p>
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleReply}
          >
            Odpovědět
          </Button>
          {canDelete ? <DeleteQuackButton quackId={reply.id} /> : null}
        </div>
        {isReplying ? (
          <ReplyForm
            targetId={reply.id}
            onSent={onSent}
            onCancel={onToggleReply}
          />
        ) : null}
      </div>
    </article>
  )
}
