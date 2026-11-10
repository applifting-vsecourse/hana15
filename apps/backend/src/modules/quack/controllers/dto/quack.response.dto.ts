import { Mood, MOODS, Poll, Quack } from '@/modules/quack/domain/quack';
import { ApiProperty } from '@nestjs/swagger';

class QuackUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  username!: string;
}

class PollOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  text!: string;

  @ApiProperty({ description: 'Number of votes for this option' })
  votes!: number;
}

export class PollResponseDto {
  @ApiProperty({ type: [PollOptionDto] })
  options!: PollOptionDto[];

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The option the signed-in user voted for, if any',
  })
  myOptionId!: string | null;

  static fromDomain(poll: Poll): PollResponseDto {
    return {
      options: poll.options.map(({ id, text, votes }) => ({ id, text, votes })),
      myOptionId: poll.myOptionId,
    };
  }
}

export class QuackResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    type: Boolean,
    description: 'Deleted quack that others replied to: no content, no author',
  })
  deleted!: boolean;

  @ApiProperty({ type: String, nullable: true })
  text!: string | null;

  @ApiProperty({ enum: MOODS, nullable: true, type: String })
  mood!: Mood | null;

  @ApiProperty({ type: String, nullable: true })
  userId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto, nullable: true })
  user!: QuackUserDto | null;

  @ApiProperty({ type: PollResponseDto, nullable: true })
  poll!: PollResponseDto | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'Root quack of the thread; null for a root quack',
  })
  threadId!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    description: 'The quack or reply this one answers; null for a root quack',
  })
  replyToId!: string | null;

  @ApiProperty({
    type: QuackUserDto,
    nullable: true,
    description: 'Author of the answered reply; null when answering the quack',
  })
  replyToUser!: QuackUserDto | null;

  @ApiProperty({ description: 'The answered reply was deleted' })
  replyToDeleted!: boolean;

  @ApiProperty({ description: 'Number of replies under this quack' })
  replyCount!: number;

  static fromDomain(quack: Quack): QuackResponseDto {
    // Only the fields below leave the server for a deleted quack.
    const common = {
      id: quack.id,
      createdAt: quack.createdAt,
      threadId: quack.threadId,
      replyToId: quack.replyToId,
      replyToDeleted: quack.replyToDeleted,
      replyCount: quack.replyCount,
    };
    // Only a reply to another reply says who it answers; a reply straight
    // to the quack has no "in reply to" line.
    const replyToUser = (
      quack.replyToId !== quack.threadId ? quack.replyToUser : null
    ) as QuackUserDto | null;

    if (quack.deleted) {
      return {
        ...common,
        deleted: true,
        text: null,
        mood: null,
        userId: null,
        user: null,
        poll: null,
        replyToUser,
      };
    }
    if (!quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    return {
      ...common,
      deleted: false,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
      replyToUser,
      poll: quack.poll ? PollResponseDto.fromDomain(quack.poll) : null,
    };
  }
}
