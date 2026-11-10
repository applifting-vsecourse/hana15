import { PrismaService } from '@/core/prisma/prisma.service';
import { User } from '@/generated/prisma/client';
import { Quack } from '@/modules/quack/domain/quack';
import { BetterAuth } from '@/shared/auth/providers/better-auth.provider';
import { Config } from '@/shared/config/config.service';
import { createQuack } from './create-quack';
import { createUser } from './create-user';

const MINUTE_IN_MS = 60 * 1000;

export const seedDatabase = async (
  prisma: PrismaService,
  config: Config,
  betterAuth: BetterAuth,
): Promise<void> => {
  const auth = betterAuth;

  // `pnpm dev` runs the seed on every start, so never clobber a database that
  // already has data — that would delete the account and posts you just made.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(
      `Database already has ${existingUsers} user(s) — skipping seed. ` +
        'Run `pnpm backend db:reset` to wipe and start over.',
    );
    return;
  }

  // Drop existing database data from all tables
  try {
    await prisma.$executeRawUnsafe(
      'TRUNCATE TABLE "quack", "session", "account", "verification", "user" RESTART IDENTITY CASCADE;',
    );
  } catch (error) {
    console.error('Error truncating tables:', error);
  }

  console.log('Creating superadmin user');

  // Create a superadmin user. This should be delete in prod app
  await createUser(prisma, auth, {
    email: config.superadminEmail,
    password: config.superadminPassword,
    name: 'Admin (Delete in Prod)',
    username: 'superadmin',
    role: 'admin',
  });

  console.log('Creating example users');

  const caffeinatedDuck = await createUser(prisma, auth, {
    email: 'caffeinatedduck@example.com',
    password: 'password1',
    name: 'Caffeinated Duck',
    username: 'CaffeinatedDuck',
  });

  const deepDuckThoughts = await createUser(prisma, auth, {
    email: 'deepduckthoughts@example.com',
    password: 'password2',
    name: 'Deep Duck Thoughts',
    username: 'DeepDuckThoughts',
  });

  const breadCritic = await createUser(prisma, auth, {
    email: 'breadcritic@example.com',
    password: 'password3',
    name: 'The Bread Critic',
    username: 'BreadCritic',
  });

  const migrationSeason = await createUser(prisma, auth, {
    email: 'migrationseason@example.com',
    password: 'password4',
    name: 'Migration Season',
    username: 'MigrationSeason',
  });

  const pondAdmin = await createUser(prisma, auth, {
    email: 'pondadmin@example.com',
    password: 'password5',
    name: 'Pond Admin',
    username: 'PondAdmin',
  });

  console.log('Creating example quacks');

  // Listed oldest first. The feed sorts newest first, so the last entry here is
  // the one at the top of the screen.
  const exampleQuacks: { author: User; minutesAgo: number; text: string }[] = [
    {
      author: pondAdmin,
      minutesAgo: 2870,
      text: `Reminder: the north end of the pond is closed for reed maintenance until Thursday.
Yes, again. No, we don't know why the contractor is a heron.`,
    },
    {
      author: migrationSeason,
      minutesAgo: 2610,
      text: `Left at dawn. 400 km down, 2,600 to go.
The V formation works beautifully right up until whoever is at the front decides to take a shortcut.`,
    },
    {
      author: breadCritic,
      minutesAgo: 2255,
      text: `Sourdough. Thrown by a child. Landed two metres short of anyone.
Crust: excellent. Delivery: amateur. 6/10.`,
    },
    {
      author: caffeinatedDuck,
      minutesAgo: 1980,
      text: `just spilled coffee on my keyboard
now every time i type "duck" it autocorrects to "quack"
send help or more caffeine`,
    },
    {
      author: deepDuckThoughts,
      minutesAgo: 1495,
      text: `If a pond reflects the sky, is the sky just a very large and very shy pond?`,
    },
    {
      author: migrationSeason,
      minutesAgo: 1240,
      text: `Update on the shortcut: it added 90 km and one entire mountain.
We are not currently speaking to the front of the V.`,
    },
    {
      author: pondAdmin,
      minutesAgo: 890,
      text: `Whoever keeps rearranging the stones on the west bank — we see you.
We have footage. It is extremely blurry footage. But we have it.`,
    },
    {
      author: caffeinatedDuck,
      minutesAgo: 640,
      text: `third espresso and i can hear colours now
one of them is quacking`,
    },
    {
      author: breadCritic,
      minutesAgo: 415,
      text: `Multigrain. Seeds still attached. Genuinely nutritious.
The pond is not ready for this level of quality and, frankly, neither am I. 9/10.`,
    },
    {
      author: deepDuckThoughts,
      minutesAgo: 260,
      text: `Everyone says "water off a duck's back" like it's a compliment.
Some of us would quite like to feel things.`,
    },
    {
      author: caffeinatedDuck,
      minutesAgo: 95,
      text: `me: throws one crumb into the pond
ducks: assemble like the Avengers
i fear i may have started something`,
    },
    {
      author: pondAdmin,
      minutesAgo: 20,
      text: `The bread situation has been resolved. The swan has been spoken to.
Please stop tagging me.`,
    },
  ];

  const now = Date.now();

  const created: Quack[] = [];
  for (const { author, minutesAgo, text } of exampleQuacks) {
    created.push(
      await createQuack(prisma, {
        text,
        userId: author.id,
        createdAt: new Date(now - minutesAgo * MINUTE_IN_MS),
      }),
    );
  }

  console.log('Creating example replies');

  const at = (minutesAgo: number): Date =>
    new Date(now - minutesAgo * MINUTE_IN_MS);
  const [, , , , , , , , , , crumbQuack, swanQuack] = created;
  const heronQuack = created[0];

  // One reply (singular count), then a thread with a reply to a reply
  // (the "in reply to" line), then a longer thread (5+ replies).
  await createQuack(prisma, {
    text: 'Is the heron at least licensed?',
    userId: breadCritic.id,
    createdAt: at(2800),
    replyTo: heronQuack,
  });

  const firstCrumbReply = await createQuack(prisma, {
    text: 'i was there. it was loud and also beautiful.',
    userId: deepDuckThoughts.id,
    createdAt: at(90),
    replyTo: crumbQuack,
  });
  await createQuack(prisma, {
    text: 'Did anyone get the crumb, or just the glory?',
    userId: migrationSeason.id,
    createdAt: at(80),
    replyTo: crumbQuack,
  });
  await createQuack(prisma, {
    text: 'only the glory. the crumb sank.',
    userId: caffeinatedDuck.id,
    createdAt: at(70),
    replyTo: firstCrumbReply,
  });

  const swanReplies = [
    { author: breadCritic, text: 'What did the swan say?', minutesAgo: 18 },
    { author: caffeinatedDuck, text: 'nothing. it hissed.', minutesAgo: 16 },
    { author: migrationSeason, text: 'Classic swan.', minutesAgo: 14 },
    { author: deepDuckThoughts, text: 'Is a hiss a reply?', minutesAgo: 12 },
    { author: breadCritic, text: 'Only if it is well baked.', minutesAgo: 10 },
    { author: caffeinatedDuck, text: 'ok that one was good', minutesAgo: 8 },
  ];
  for (const { author, text, minutesAgo } of swanReplies) {
    await createQuack(prisma, {
      text,
      userId: author.id,
      createdAt: at(minutesAgo),
      replyTo: swanQuack,
    });
  }
};
