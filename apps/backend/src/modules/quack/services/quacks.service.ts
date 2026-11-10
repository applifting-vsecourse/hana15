import { Mood, Poll, Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

// Shorter searches show the full feed, so a single stray letter doesn't
// filter it (and doesn't count as a search in the usage log).
const MIN_SEARCH_LENGTH = 2;

@Injectable()
export class QuacksService {
  private readonly logger = new Logger(QuacksService.name);

  constructor(private readonly quackRepository: QuackRepository) {}

  async getQuacks(
    user: Identity,
    options: { search?: string; mine?: boolean } = {},
  ): Promise<Quack[]> {
    // "mine" is resolved from the session, never from a request parameter
    const authorId = options.mine ? user.id : undefined;
    const term = options.search?.trim() ?? '';
    if (term.length < MIN_SEARCH_LENGTH) {
      return authorId
        ? this.quackRepository.getQuacks(user.id, { authorId })
        : this.quackRepository.getQuacks(user.id);
    }

    const quacks = await this.quackRepository.getQuacks(user.id, {
      words: term.split(/\s+/),
      authorId,
    });
    // Measures whether people use search. Never log the query text itself.
    this.logger.log(
      `Quack search: userId=${user.id} queryLength=${term.length} results=${quacks.length}`,
    );
    return quacks;
  }

  async createQuack(
    user: Identity,
    quackData: { text: string; mood?: Mood; pollOptions?: string[] },
  ): Promise<Quack> {
    const pollOptions = quackData.pollOptions?.map((option) => option.trim());
    if (pollOptions) {
      // Count and length rules live in the DTO; duplicates need the whole list.
      const seen = new Set<string>();
      for (const option of pollOptions) {
        const key = option.toLowerCase();
        if (seen.has(key)) {
          throw new BadRequestException('Poll options must be different');
        }
        seen.add(key);
      }
    }

    const quack = await this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      // the author is taken from the session, never from the request body
      userId: user.id,
      ...(pollOptions ? { pollOptions } : {}),
    });
    if (quack.poll) {
      // Measures whether people use polls. Never log the question or options.
      this.logger.log(`Poll created: userId=${user.id} pollId=${quack.id}`);
    }
    return quack;
  }

  /** Replies of a quack, oldest first. */
  async getReplies(user: Identity, quackId: string): Promise<Quack[]> {
    const target = await this.quackRepository.getQuackRef(quackId);
    if (!target) throw new NotFoundException('Quack not found');
    // Replies always hang off the root quack, whichever reply is asked about.
    return this.quackRepository.getReplies(
      target.threadId ?? target.id,
      user.id,
    );
  }

  /** Replies to a quack or to a reply; the author comes from the session. */
  async createReply(
    user: Identity,
    targetId: string,
    text: string,
  ): Promise<Quack> {
    const target = await this.quackRepository.getQuackRef(targetId);
    if (!target || target.deleted) {
      throw new NotFoundException('Quack not found');
    }

    const reply = await this.quackRepository.createReply({
      text,
      userId: user.id,
      // The thread is fixed here, from the target, and never changes later.
      threadId: target.threadId ?? target.id,
      replyToId: target.id,
    });
    if (!reply) throw new NotFoundException('Quack not found');
    return reply;
  }

  async vote(user: Identity, quackId: string, optionId: string): Promise<Poll> {
    const poll = await this.quackRepository.vote({
      quackId,
      optionId,
      userId: user.id,
    });
    if (!poll) {
      throw new NotFoundException('That option is not part of this poll');
    }
    this.logger.log(`Poll vote: userId=${user.id} pollId=${quackId}`);
    return poll;
  }

  async deleteQuack(user: Identity, quackId: string): Promise<void> {
    const quack = await this.quackRepository.getQuackOwner(quackId);
    // A placeholder has no content left to delete.
    if (!quack || quack.deleted) {
      throw new NotFoundException('Quack not found');
    }
    // The permission check lives here, not in the UI: the API is callable directly.
    // The role comes from the session, never from the request.
    if (quack.userId !== user.id && user.role !== 'admin') {
      throw new ForbiddenException('You can only delete your own quacks');
    }
    // Physical delete or placeholder is decided by the repository (ADR 0001).
    await this.quackRepository.deleteQuack(quackId);
  }
}
