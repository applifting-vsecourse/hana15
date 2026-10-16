import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from 'better-auth/api';
import { openAPI, username } from 'better-auth/plugins';
import { BetterAuthOptions } from 'better-auth/types';

export const BIO_MAX_LENGTH = 160;
const MOODS = ['happy', 'sad', 'angry', 'silly'];

export const betterAuthCoreConfig: BetterAuthOptions = {
  emailAndPassword: {
    enabled: true,
  },
  user: {
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'user',
        input: false,
      },
      bio: {
        type: 'string',
        required: false,
      },
      defaultMood: {
        type: 'string',
        required: false,
      },
    },
  },
  hooks: {
    // Profile rules are enforced here, not only in the settings form.
    before: createAuthMiddleware(async (ctx) => {
      // Usernames keep the case they were typed in, but "pondadmin" must still
      // count as taken when "PondAdmin" exists, so the plugin's exact-match
      // check is not enough.
      if (ctx.path === '/update-user' || ctx.path === '/sign-up/email') {
        const username = (ctx.body as { username?: unknown } | undefined)
          ?.username;
        if (typeof username === 'string' && username) {
          const existing = await ctx.context.adapter.findOne<{ id: string }>({
            model: 'user',
            where: [
              { field: 'username', value: username, mode: 'insensitive' },
            ],
          });
          const session =
            ctx.path === '/update-user' ? await getSessionFromCtx(ctx) : null;
          if (existing && existing.id !== session?.user.id) {
            throw new APIError('BAD_REQUEST', {
              code: 'USERNAME_IS_ALREADY_TAKEN',
              message: 'Username is already taken. Please try another.',
            });
          }
        }
      }

      if (ctx.path !== '/update-user') return;
      const { name, bio, defaultMood } = (ctx.body ?? {}) as Record<
        string,
        unknown
      >;

      if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        throw new APIError('BAD_REQUEST', { message: 'Name is required' });
      }
      if (
        bio != null &&
        (typeof bio !== 'string' || bio.length > BIO_MAX_LENGTH)
      ) {
        throw new APIError('BAD_REQUEST', {
          message: `Bio can be at most ${BIO_MAX_LENGTH} characters`,
        });
      }
      if (
        defaultMood != null &&
        (typeof defaultMood !== 'string' || !MOODS.includes(defaultMood))
      ) {
        throw new APIError('BAD_REQUEST', { message: 'Invalid default mood' });
      }
    }),
  },
  plugins: [
    openAPI(),
    // By default the plugin lowercases usernames; store them as typed instead.
    // Uniqueness is checked case-insensitively in the hook above.
    username({ usernameNormalization: false }),
  ],
};
