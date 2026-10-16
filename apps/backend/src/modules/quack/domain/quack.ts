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
  text: string;
  mood: Mood | null;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  user?: QuackAuthor;
  /** Present when the quack has options to vote on. */
  poll: Poll | null;
};
