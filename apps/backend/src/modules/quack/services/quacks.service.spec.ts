// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const aQuack = (overrides: Partial<Quack> = {}): Quack => ({
  id: 'q1',
  text: 'quack quack',
  mood: null,
  userId: 'u1',
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  user: { id: 'u1', name: 'Caffeinated Duck', username: 'CaffeinatedDuck' },
  poll: null,
  threadId: null,
  replyToId: null,
  replyToUser: null,
  replyCount: 0,
  ...overrides,
});

const user = { id: 'u1' } as Identity;

describe('QuacksService', () => {
  it('returns quacks from the repository', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(user)).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
    expect(repository.getQuacks).toHaveBeenCalledWith('u1');
  });

  it('splits a search into words and filters by all of them', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(
      service.getQuacks(user, { search: '  critic   bread ' }),
    ).resolves.toEqual(quacks);
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      words: ['critic', 'bread'],
    });
  });

  it.each(['', ' ', 'a', ' a  '])(
    'shows the full feed for a search shorter than 2 characters (%p)',
    async (search) => {
      const repository = mock<QuackRepository>();
      repository.getQuacks.mockResolvedValue([]);

      const service = new QuacksService(repository);
      await service.getQuacks(user, { search: search });

      expect(repository.getQuacks).toHaveBeenCalledTimes(1);
      expect(repository.getQuacks).toHaveBeenCalledWith('u1');
    },
  );

  it('logs who searched, how long the query was and how many matched, but not the query', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([aQuack(), aQuack({ id: 'q2' })]);

    const service = new QuacksService(repository);
    await service.getQuacks(user, { search: ' secret words ' });

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'Quack search: userId=u1 queryLength=12 results=2',
    );
    log.mockRestore();
  });

  it('does not log when there is no search', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(user);

    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });

  it('creates a quack owned by the signed-in user', async () => {
    const created = aQuack({ id: 'q2', text: 'hello' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(service.createQuack(user, { text: 'hello' })).resolves.toEqual(
      created,
    );
    // the author comes from the session, not from the caller's payload
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'hello',
      userId: 'u1',
    });
  });

  it('passes the chosen mood through to the repository', async () => {
    const created = aQuack({ id: 'q3', text: 'lol', mood: 'silly' });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    const service = new QuacksService(repository);
    const user = { id: 'u1' } as Identity;

    await expect(
      service.createQuack(user, { text: 'lol', mood: 'silly' }),
    ).resolves.toEqual(created);
    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'lol',
      mood: 'silly',
      userId: 'u1',
    });
  });

  it('creates a poll with trimmed options and logs it without the content', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const created = aQuack({
      id: 'q4',
      poll: {
        options: [
          { id: 'o1', text: 'Thai', votes: 0 },
          { id: 'o2', text: 'Pizza', votes: 0 },
        ],
        myOptionId: null,
      },
    });
    const repository = mock<QuackRepository>();
    repository.createQuack.mockResolvedValue(created);

    await new QuacksService(repository).createQuack(user, {
      text: 'Lunch?',
      pollOptions: [' Thai ', 'Pizza'],
    });

    expect(repository.createQuack).toHaveBeenCalledWith({
      text: 'Lunch?',
      userId: 'u1',
      pollOptions: ['Thai', 'Pizza'],
    });
    expect(log).toHaveBeenCalledWith('Poll created: userId=u1 pollId=q4');
    log.mockRestore();
  });

  it('rejects poll options that differ only by letter case', async () => {
    const repository = mock<QuackRepository>();

    await expect(
      new QuacksService(repository).createQuack(user, {
        text: 'Lunch?',
        pollOptions: ['Thai', ' thai'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createQuack).not.toHaveBeenCalled();
  });

  it('records a vote and logs it without the content', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const poll = {
      options: [{ id: 'o1', text: 'Thai', votes: 1 }],
      myOptionId: 'o1',
    };
    const repository = mock<QuackRepository>();
    repository.vote.mockResolvedValue(poll);

    await expect(
      new QuacksService(repository).vote(user, 'q4', 'o1'),
    ).resolves.toEqual(poll);
    expect(repository.vote).toHaveBeenCalledWith({
      quackId: 'q4',
      optionId: 'o1',
      userId: 'u1',
    });
    expect(log).toHaveBeenCalledWith('Poll vote: userId=u1 pollId=q4');
    log.mockRestore();
  });

  it('refuses a vote for an option that is not in the poll', async () => {
    const repository = mock<QuackRepository>();
    repository.vote.mockResolvedValue(null);

    await expect(
      new QuacksService(repository).vote(user, 'q4', 'nope'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("filters to the signed-in user's quacks when mine is set", async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(user, { mine: true });

    expect(repository.getQuacks).toHaveBeenCalledWith('u1', { authorId: 'u1' });
  });

  it('combines mine with a search', async () => {
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([]);

    await new QuacksService(repository).getQuacks(user, {
      search: 'bread',
      mine: true,
    });

    expect(repository.getQuacks).toHaveBeenCalledWith('u1', {
      words: ['bread'],
      authorId: 'u1',
    });
  });

  describe('deleteQuack', () => {
    it('deletes the quack of its author', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackOwnerId.mockResolvedValue('u1');

      await new QuacksService(repository).deleteQuack(user, 'q1');

      expect(repository.deleteQuack).toHaveBeenCalledWith('q1');
    });

    it("refuses to delete someone else's quack", async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackOwnerId.mockResolvedValue('other');

      await expect(
        new QuacksService(repository).deleteQuack(user, 'q1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });

    it("lets a moderator delete someone else's quack", async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackOwnerId.mockResolvedValue('other');
      const moderator = { id: 'u2', role: 'admin' } as Identity;

      await new QuacksService(repository).deleteQuack(moderator, 'q1');

      expect(repository.deleteQuack).toHaveBeenCalledWith('q1');
    });

    it('reports a missing quack', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackOwnerId.mockResolvedValue(null);

      await expect(
        new QuacksService(repository).deleteQuack(user, 'nope'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.deleteQuack).not.toHaveBeenCalled();
    });
  });

  describe('replies', () => {
    it('replying to a root quack makes that quack the thread', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue({ id: 'q1', threadId: null });
      repository.createReply.mockResolvedValue(aQuack({ id: 'r1' }));

      await new QuacksService(repository).createReply(user, 'q1', 'hi');

      expect(repository.createReply).toHaveBeenCalledWith({
        text: 'hi',
        userId: 'u1',
        threadId: 'q1',
        replyToId: 'q1',
      });
    });

    it('replying to a reply keeps the root as the thread (flat list)', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue({ id: 'r1', threadId: 'q1' });
      repository.createReply.mockResolvedValue(aQuack({ id: 'r2' }));

      await new QuacksService(repository).createReply(user, 'r1', 'hi');

      expect(repository.createReply).toHaveBeenCalledWith({
        text: 'hi',
        userId: 'u1',
        threadId: 'q1',
        replyToId: 'r1',
      });
    });

    it('takes the author from the session', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue({ id: 'q1', threadId: null });
      repository.createReply.mockResolvedValue(aQuack());

      await new QuacksService(repository).createReply(
        { id: 'session-user' } as Identity,
        'q1',
        'hi',
      );

      expect(repository.createReply).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'session-user' }),
      );
    });

    it('refuses a reply to a quack that does not exist', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue(null);

      await expect(
        new QuacksService(repository).createReply(user, 'nope', 'hi'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(repository.createReply).not.toHaveBeenCalled();
    });

    it('refuses a reply when the quack is deleted during the insert', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue({ id: 'q1', threadId: null });
      repository.createReply.mockResolvedValue(null);

      await expect(
        new QuacksService(repository).createReply(user, 'q1', 'hi'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lists the replies of the root quack, also when asked via a reply', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue({ id: 'r1', threadId: 'q1' });
      repository.getReplies.mockResolvedValue([]);

      await new QuacksService(repository).getReplies(user, 'r1');

      expect(repository.getReplies).toHaveBeenCalledWith('q1', 'u1');
    });

    it('reports replies of a missing quack', async () => {
      const repository = mock<QuackRepository>();
      repository.getQuackRef.mockResolvedValue(null);

      await expect(
        new QuacksService(repository).getReplies(user, 'nope'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    describe('deleting a reply', () => {
      it("refuses someone else's reply", async () => {
        const repository = mock<QuackRepository>();
        repository.getQuackOwnerId.mockResolvedValue('other');

        await expect(
          new QuacksService(repository).deleteQuack(user, 'r1'),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repository.deleteQuack).not.toHaveBeenCalled();
      });

      it("lets a moderator delete someone else's reply", async () => {
        const repository = mock<QuackRepository>();
        repository.getQuackOwnerId.mockResolvedValue('other');
        repository.countReactions.mockResolvedValue(0);

        await new QuacksService(repository).deleteQuack(
          { id: 'u2', role: 'admin' } as Identity,
          'r1',
        );

        expect(repository.deleteQuack).toHaveBeenCalledWith('r1');
      });

      it('does not delete a post that others replied to', async () => {
        const repository = mock<QuackRepository>();
        repository.getQuackOwnerId.mockResolvedValue('u1');
        repository.countReactions.mockResolvedValue(2);

        await expect(
          new QuacksService(repository).deleteQuack(user, 'q1'),
        ).rejects.toBeInstanceOf(ConflictException);
        expect(repository.deleteQuack).not.toHaveBeenCalled();
      });
    });
  });
});
