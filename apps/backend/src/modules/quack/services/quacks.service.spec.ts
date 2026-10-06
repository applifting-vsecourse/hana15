// Example unit test — the pattern to copy for your own services.
// The repository is mocked, so the test exercises the service in isolation.
import { Quack } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { Logger } from '@nestjs/common';
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
    expect(repository.getQuacks).toHaveBeenCalledWith();
  });

  it('splits a search into words and filters by all of them', async () => {
    const quacks = [aQuack()];
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue(quacks);

    const service = new QuacksService(repository);

    await expect(service.getQuacks(user, '  critic   bread ')).resolves.toEqual(
      quacks,
    );
    expect(repository.getQuacks).toHaveBeenCalledTimes(1);
    expect(repository.getQuacks).toHaveBeenCalledWith({
      words: ['critic', 'bread'],
    });
  });

  it.each(['', ' ', 'a', ' a  '])(
    'shows the full feed for a search shorter than 2 characters (%p)',
    async (search) => {
      const repository = mock<QuackRepository>();
      repository.getQuacks.mockResolvedValue([]);

      const service = new QuacksService(repository);
      await service.getQuacks(user, search);

      expect(repository.getQuacks).toHaveBeenCalledTimes(1);
      expect(repository.getQuacks).toHaveBeenCalledWith();
    },
  );

  it('logs who searched, how long the query was and how many matched, but not the query', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const repository = mock<QuackRepository>();
    repository.getQuacks.mockResolvedValue([aQuack(), aQuack({ id: 'q2' })]);

    const service = new QuacksService(repository);
    await service.getQuacks(user, ' secret words ');

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
});
