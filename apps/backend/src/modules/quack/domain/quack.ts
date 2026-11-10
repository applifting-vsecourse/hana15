export type QuackAuthor = {
  id: string;
  name: string;
  username: string;
};

export const MOODS = ['happy', 'sad', 'angry', 'silly'] as const;

export type Mood = (typeof MOODS)[number];

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 5;
export const POLL_OPTION_MAX_LENGTH = 60;

export type PollOption = {
  id: string;
  text: string;
  votes: number;
};

export type Poll = {
  options: PollOption[];
  /** The option the requesting user voted for, if any. */
  myOptionId: string | null;
};

export type Quack = {
  id: string;
  /** Empty for a deleted quack (placeholder row). */
  text: string | null;
  mood: Mood | null;
  /** Empty for a deleted quack: its author is not stored any more. */
  userId: string | null;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  /** Root quack of the thread; null for a root quack itself. */
  threadId: string | null;
  /** The quack or reply this one answers; null for a root quack. */
  replyToId: string | null;
  /** Author of the answered quack or reply (replies only). */
  replyToUser: QuackAuthor | null;
  /** A deleted quack that others replied to; it carries no content or author. */
  deleted: boolean;
  /** The answered reply was deleted (replies only). */
  replyToDeleted: boolean;
  /** Number of replies in the thread (root quacks only), deleted ones not counted. */
  replyCount: number;
  /** Present when the quack has options to vote on. */
  poll: Poll | null;
};
