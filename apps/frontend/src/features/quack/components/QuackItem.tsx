import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDate } from "@/lib/date"

import type { Quack } from "@/features/quack/api/quackSchemas"
import { QuackMood } from "@/features/quack/components/QuackMood"
import { QuackPoll } from "@/features/quack/components/QuackPoll"
import { QuackReplies } from "@/features/quack/components/QuackReplies"
import { UsersName } from "@/features/quack/components/UsersName"
import { UsersUserName } from "@/features/quack/components/UsersUserName"

type QuackItemProps = {
  quack: Quack
  canDelete?: boolean
  currentUserId?: string
  isModerator?: boolean
  canReply?: boolean
}

export function QuackItem({
  quack,
  canDelete,
  currentUserId,
  isModerator,
  canReply = true,
}: QuackItemProps) {
  if (quack.deleted || !quack.user) {
    return (
      <article className="flex w-full flex-col gap-2 border-b border-border pt-2 pb-4 last:border-b-0">
        <p className="text-sm text-muted-foreground">Quack byl smazán</p>
        <QuackReplies
          quack={quack}
          currentUserId={currentUserId}
          isModerator={isModerator}
          canReply={canReply}
        />
      </article>
    )
  }

  const { name, username } = quack.user

  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <article className="flex w-full gap-4 border-b border-border pt-2 pb-4 last:border-b-0">
      <Avatar className="size-12">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span>
            <UsersName name={name} /> <UsersUserName username={username} />
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <time className="text-xs text-muted-foreground">{formatDate(quack.createdAt)}</time>
          {quack.mood ? (
            <>
              <span className="text-xs text-muted-foreground">·</span>
              <QuackMood mood={quack.mood} />
            </>
          ) : null}
        </div>
        <p className="text-sm break-words whitespace-pre-line">{quack.text}</p>
        {quack.poll ? (
          <QuackPoll
            quackId={quack.id}
            poll={quack.poll}
          />
        ) : null}
        <QuackReplies
          quack={quack}
          currentUserId={currentUserId}
          isModerator={isModerator}
          canDelete={canDelete}
          canReply={canReply}
        />
      </div>
    </article>
  )
}
