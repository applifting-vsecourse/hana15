import { Quack } from '@/modules/quack/domain/quack';
import { QuackResponseDto } from './quack.response.dto';

const deletedQuack: Quack = {
  id: 'q1',
  text: null,
  mood: null,
  userId: null,
  createdAt: new Date('2026-01-01T12:00:00Z'),
  updatedAt: new Date('2026-01-01T12:00:00Z'),
  threadId: null,
  replyToId: null,
  replyToUser: null,
  replyToDeleted: false,
  deleted: true,
  replyCount: 3,
  poll: null,
};

describe('QuackResponseDto.fromDomain', () => {
  it('never exposes content, mood, poll or author of a deleted quack', () => {
    // Even if the domain object carried leftovers, none of them may leave.
    const leaky = {
      ...deletedQuack,
      text: 'secret',
      mood: 'happy',
      userId: 'u1',
      user: { id: 'u1', name: 'Duck', username: 'duck' },
      poll: { options: [{ id: 'o1', text: 'x', votes: 4 }], myOptionId: 'o1' },
    } as Quack;

    const dto = QuackResponseDto.fromDomain(leaky);

    expect(dto).toEqual({
      id: 'q1',
      createdAt: deletedQuack.createdAt,
      deleted: true,
      text: null,
      mood: null,
      userId: null,
      user: null,
      poll: null,
      threadId: null,
      replyToId: null,
      replyToUser: null,
      replyToDeleted: false,
      replyCount: 3,
    });
  });

  it('says a reply answers a deleted reply, without naming an author', () => {
    const dto = QuackResponseDto.fromDomain({
      ...deletedQuack,
      id: 'r2',
      deleted: false,
      text: 'hi',
      userId: 'u2',
      user: { id: 'u2', name: 'B', username: 'b' },
      threadId: 'q1',
      replyToId: 'r1',
      replyToDeleted: true,
    });

    expect(dto.replyToDeleted).toBe(true);
    expect(dto.replyToUser).toBeNull();
  });
});
