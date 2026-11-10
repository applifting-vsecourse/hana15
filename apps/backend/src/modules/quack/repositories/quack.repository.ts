import { PrismaService } from '@/core/prisma/prisma.service';
import { Prisma } from '@/generated/prisma/client';
import { Mood, Poll, Quack, QuackAuthor } from '@/modules/quack/domain/quack';
import { Injectable } from '@nestjs/common';

// Options with their vote count, plus the requesting user's own vote (if any).
// The return type is inferred on purpose: Prisma derives the result type from it.
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const pollOptionsInclude = (userId: string) =>
  ({
    orderBy: { position: 'asc' },
    include: {
      _count: { select: { votes: true } },
      votes: { where: { userId }, select: { id: true } },
    },
  }) satisfies Prisma.Quack$pollOptionsArgs;

type PrismaPollOptions = Prisma.PollOptionGetPayload<{
  include: {
    _count: { select: { votes: true } };
    votes: { select: { id: true } };
  };
}>[];

const mapPollToDomain = (options: PrismaPollOptions): Poll | null =>
  options.length === 0
    ? null
    : {
        options: options.map((option) => ({
          id: option.id,
          text: option.text,
          votes: option._count.votes,
        })),
        myOptionId:
          options.find((option) => option.votes.length > 0)?.id ?? null,
      };

type PrismaQuackWithRelations = Prisma.QuackGetPayload<{
  include: { user: true };
}> & {
  pollOptions: PrismaPollOptions;
  replyTo?: Prisma.QuackGetPayload<{ include: { user: true } }> | null;
  _count?: { replies: number };
};

const toAuthor = (user: {
  id: string;
  name: string;
  username: string | null;
}): QuackAuthor => ({
  id: user.id,
  name: user.name,
  username: user.username ?? '',
});

const mapPrismaQuackToDomain = (quack: PrismaQuackWithRelations): Quack => ({
  id: quack.id,
  text: quack.text,
  mood: quack.mood,
  userId: quack.userId,
  createdAt: quack.createdAt,
  updatedAt: quack.updatedAt,
  user: quack.user ? toAuthor(quack.user) : undefined,
  threadId: quack.threadId,
  replyToId: quack.replyToId,
  replyToUser: quack.replyTo?.user ? toAuthor(quack.replyTo.user) : null,
  replyCount: quack._count?.replies ?? 0,
  poll: mapPollToDomain(quack.pollOptions),
});

// Prisma's `contains` becomes a LIKE pattern without escaping, so a typed
// `%` or `_` would act as a wildcard and match everything.
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, '\\$&');

/**
 * If you decide to choose a different ORM or database, you should only need to change the repository files methods implementation.
 * Inject what you need instead of PrismaService and re-implement the methods and model mapping.
 */
@Injectable()
export class QuackRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * With `words`, only quacks containing every word (in the text or the
   * author's display name, case-insensitive, accents significant) are returned.
   */
  async getQuacks(
    viewerId: string,
    filter?: { words?: string[]; authorId?: string },
  ): Promise<Quack[]> {
    const quacks = await this.prisma.quack.findMany({
      // Replies show up only under their quack, never in the feed.
      where: filter
        ? {
            threadId: null,
            userId: filter.authorId,
            AND: (filter.words ?? []).map(escapeLike).map((word) => ({
              OR: [
                { text: { contains: word, mode: 'insensitive' as const } },
                {
                  user: {
                    name: { contains: word, mode: 'insensitive' as const },
                  },
                },
              ],
            })),
          }
        : { threadId: null },
      include: {
        user: true,
        pollOptions: pollOptionsInclude(viewerId),
        _count: { select: { replies: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return quacks.map(mapPrismaQuackToDomain);
  }

  /** Replies of one thread, oldest first. */
  async getReplies(threadId: string, viewerId: string): Promise<Quack[]> {
    const replies = await this.prisma.quack.findMany({
      where: { threadId },
      include: {
        user: true,
        pollOptions: pollOptionsInclude(viewerId),
        replyTo: { include: { user: true } },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return replies.map(mapPrismaQuackToDomain);
  }

  async getQuackRef(
    id: string,
  ): Promise<{ id: string; threadId: string | null } | null> {
    return this.prisma.quack.findUnique({
      where: { id },
      select: { id: true, threadId: true },
    });
  }

  /**
   * Stores a reply. Returns null when the answered quack no longer exists
   * (deleted between the lookup and the insert).
   */
  async createReply(data: {
    text: string;
    userId: string;
    threadId: string;
    replyToId: string;
  }): Promise<Quack | null> {
    try {
      const reply = await this.prisma.quack.create({
        data,
        include: {
          user: true,
          pollOptions: pollOptionsInclude(data.userId),
          replyTo: { include: { user: true } },
        },
      });
      return mapPrismaQuackToDomain(reply);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        return null;
      }
      throw error;
    }
  }

  async countReactions(id: string): Promise<number> {
    return this.prisma.quack.count({
      where: { OR: [{ threadId: id }, { replyToId: id }] },
    });
  }

  async createQuack(createQuackData: {
    text: string;
    mood?: Mood;
    userId: string;
    pollOptions?: string[];
  }): Promise<Quack> {
    const quack = await this.prisma.quack.create({
      data: {
        text: createQuackData.text,
        mood: createQuackData.mood,
        user: { connect: { id: createQuackData.userId } },
        pollOptions: createQuackData.pollOptions
          ? {
              create: createQuackData.pollOptions.map((text, position) => ({
                text,
                position,
              })),
            }
          : undefined,
      },
      include: {
        user: true,
        pollOptions: pollOptionsInclude(createQuackData.userId),
      },
    });
    return mapPrismaQuackToDomain(quack);
  }

  async getPoll(quackId: string, userId: string): Promise<Poll | null> {
    const options = await this.prisma.pollOption.findMany({
      where: { quackId },
      ...pollOptionsInclude(userId),
    });
    return mapPollToDomain(options);
  }

  /**
   * Records the user's vote, moving it if they already voted. Returns null when
   * the option isn't part of that quack's poll. The upsert targets the unique
   * (quackId, userId) index, so concurrent clicks can never leave two votes.
   */
  async vote(data: {
    quackId: string;
    optionId: string;
    userId: string;
  }): Promise<Poll | null> {
    const option = await this.prisma.pollOption.findFirst({
      where: { id: data.optionId, quackId: data.quackId },
      select: { id: true },
    });
    if (!option) return null;

    await this.prisma.pollVote.upsert({
      where: {
        quackId_userId: { quackId: data.quackId, userId: data.userId },
      },
      create: data,
      update: { optionId: data.optionId },
    });
    return this.getPoll(data.quackId, data.userId);
  }

  async getQuackOwnerId(id: string): Promise<string | null> {
    const quack = await this.prisma.quack.findUnique({
      where: { id },
      select: { userId: true },
    });
    return quack?.userId ?? null;
  }

  async deleteQuack(id: string): Promise<void> {
    await this.prisma.quack.delete({ where: { id } });
  }
}
