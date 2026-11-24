// Likes (cases.md, section 1: P1-P11). The repository is replaced by a small
// in-memory fake so the tests can follow state across several calls.
// P12 (placeholder row has no count) is in quack.response.dto.spec.ts.
import { LikeState } from '@/modules/quack/domain/quack';
import { QuackRepository } from '@/modules/quack/repositories/quack.repository';
import { Identity } from '@/shared/auth/domain/identity';
import { NotFoundException } from '@nestjs/common';
import { mock } from 'jest-mock-extended';
import { QuacksService } from './quacks.service';

const A = new Identity('A', 'a@example.com', 'A', 'user');
const B = new Identity('B', 'b@example.com', 'B', 'user');
const MODERATOR = new Identity('M', 'm@example.com', 'M', 'admin');

type Ref = { id: string; threadId: string | null; deleted: boolean };

function setup(quacks: Ref[] = [{ id: 'q1', threadId: null, deleted: false }]) {
  const likes = new Set<string>(); // "quackId|userId"
  const repository = mock<QuackRepository>();
  repository.getQuackRef.mockImplementation((id) =>
    Promise.resolve(quacks.find((q) => q.id === id) ?? null),
  );
  repository.addLike.mockImplementation(({ quackId, userId }) => {
    likes.add(`${quackId}|${userId}`);
    return Promise.resolve();
  });
  repository.removeLike.mockImplementation(({ quackId, userId }) => {
    likes.delete(`${quackId}|${userId}`);
    return Promise.resolve();
  });
  repository.getLikeState.mockImplementation((quackId, userId) =>
    Promise.resolve({
      likeCount: [...likes].filter((l) => l.startsWith(`${quackId}|`)).length,
      likedByMe: likes.has(`${quackId}|${userId}`),
    }),
  );
  return { service: new QuacksService(repository), repository, likes };
}

const state = (likeCount: number, likedByMe: boolean): LikeState => ({
  likeCount,
  likedByMe,
});

describe('QuacksService likes', () => {
  it('P1 a like raises the count from 0 to 1', async () => {
    const { service } = setup();
    await expect(service.like(A, 'q1')).resolves.toEqual(state(1, true));
  });

  it('P2 taking the like back lowers the count from 1 to 0', async () => {
    const { service } = setup();
    await service.like(A, 'q1');
    await expect(service.unlike(A, 'q1')).resolves.toEqual(state(0, false));
  });

  it('P3 liking twice keeps one like, no error, returns the current state', async () => {
    const { service, likes } = setup();
    await service.like(A, 'q1');
    await expect(service.like(A, 'q1')).resolves.toEqual(state(1, true));
    expect(likes.size).toBe(1);
  });

  it('P4 unliking without a like is a no-op, no error, returns the current state', async () => {
    const { service } = setup();
    await expect(service.unlike(A, 'q1')).resolves.toEqual(state(0, false));
  });

  it('P5 likes of different users add up; one taking theirs back leaves the other', async () => {
    const { service } = setup();
    await service.like(A, 'q1');
    await service.like(B, 'q1');
    await expect(service.unlike(A, 'q1')).resolves.toEqual(state(1, false));
    await expect(service.like(B, 'q1')).resolves.toEqual(state(1, true));
  });

  it('P6 the author may like their own quack', async () => {
    const { service } = setup();
    // A is the author of q1 (the service has no rule against it).
    await expect(service.like(A, 'q1')).resolves.toEqual(state(1, true));
  });

  it('P7 a reply is liked like a quack, the parent count is unchanged', async () => {
    const { service } = setup([
      { id: 'q1', threadId: null, deleted: false },
      { id: 'r1', threadId: 'q1', deleted: false },
    ]);
    await expect(service.like(A, 'r1')).resolves.toEqual(state(1, true));
    await expect(service.unlike(B, 'q1')).resolves.toEqual(state(0, false));
  });

  describe.each([
    ['like', (s: QuacksService, id: string) => s.like(A, id)],
    ['unlike', (s: QuacksService, id: string) => s.unlike(A, id)],
  ])('%s', (_name, act) => {
    it('P8 a deleted quack (placeholder row) is not found and nothing is written', async () => {
      const { service, repository } = setup([
        { id: 'q1', threadId: null, deleted: true },
      ]);
      await expect(act(service, 'q1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.addLike).not.toHaveBeenCalled();
      expect(repository.removeLike).not.toHaveBeenCalled();
    });

    it('P9 a quack that does not exist is not found', async () => {
      const { service, repository } = setup();
      await expect(act(service, 'nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repository.addLike).not.toHaveBeenCalled();
      expect(repository.removeLike).not.toHaveBeenCalled();
    });
  });

  it('P10 the user comes from the session; the service takes no other user id', async () => {
    const { service, repository } = setup();
    // The only identity the service accepts is the session user. Anything a
    // request body carries is dropped before it gets here (see A14).
    await service.like(A, 'q1');
    await service.unlike(B, 'q1');
    expect(repository.addLike).toHaveBeenCalledWith({
      quackId: 'q1',
      userId: 'A',
    });
    expect(repository.removeLike).toHaveBeenCalledWith({
      quackId: 'q1',
      userId: 'B',
    });
    expect(repository.addLike).not.toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'B' }),
    );
  });

  it('P11 a moderator follows the same rules: like, like again, unlike', async () => {
    const { service } = setup();
    await expect(service.like(MODERATOR, 'q1')).resolves.toEqual(
      state(1, true),
    );
    await expect(service.like(MODERATOR, 'q1')).resolves.toEqual(
      state(1, true),
    );
    await expect(service.unlike(MODERATOR, 'q1')).resolves.toEqual(
      state(0, false),
    );
    await expect(service.unlike(MODERATOR, 'q1')).resolves.toEqual(
      state(0, false),
    );
  });
});
