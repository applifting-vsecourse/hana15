import { Mood, Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Injectable, Logger } from '@nestjs/common';

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
      return this.quackRepository.getQuacks();
    }

    const quacks = await this.quackRepository.getQuacks({
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
    quackData: { text: string; mood?: Mood },
  ): Promise<Quack> {
    return this.quackRepository.createQuack({
      text: quackData.text,
      mood: quackData.mood,
      // the author is taken from the session, never from the request body
      userId: user.id,
    });
  }
}
