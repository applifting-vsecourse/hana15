import { Mood, Poll, Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
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

  async getQuacks(user: Identity, search?: string): Promise<Quack[]> {
    const term = search?.trim() ?? '';
    if (term.length < MIN_SEARCH_LENGTH) {
      return this.quackRepository.getQuacks(user.id);
    }

    const quacks = await this.quackRepository.getQuacks(user.id, {
      words: term.split(/\s+/),
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
}
