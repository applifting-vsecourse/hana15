import { PrismaService } from '@/core/prisma/prisma.service';
import { Quack } from '@/modules/quack/domain/quack';

type CreateQuackParams = {
  text: string;
  userId: string;
  // Optional so the seed can spread posts over time. Without it every seeded
  // quack shares one timestamp and the feed reads like a single burst.
  createdAt?: Date;
  // Set to make this a reply: the quack or reply it answers.
  replyTo?: Quack;
};

export async function createQuack(
  prisma: PrismaService,
  params: CreateQuackParams,
): Promise<Quack> {
  const { text, userId, createdAt, replyTo } = params;

  const quack = await prisma.quack.create({
    data: {
      text,
      createdAt,
      ...(replyTo
        ? {
            thread: { connect: { id: replyTo.threadId ?? replyTo.id } },
            replyTo: { connect: { id: replyTo.id } },
          }
        : {}),
      user: {
        connect: {
          id: userId,
        },
      },
    },
  });
  return { ...quack, replyToUser: null, replyCount: 0, poll: null };
}
