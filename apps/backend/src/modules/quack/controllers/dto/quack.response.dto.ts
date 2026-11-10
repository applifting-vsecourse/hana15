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

  @ApiProperty()
  text!: string;

  @ApiProperty({ enum: MOODS, nullable: true, type: String })
  mood!: Mood | null;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: QuackUserDto })
  user!: QuackUserDto;

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

  @ApiProperty({ description: 'Number of replies under this quack' })
  replyCount!: number;

  static fromDomain(quack: Quack): QuackResponseDto {
    if (!quack.user) {
      throw new Error(
        `QuackResponseDto.fromDomain expected quack.user to be loaded for quack ${quack.id}`,
      );
    }
    return {
      id: quack.id,
      text: quack.text,
      mood: quack.mood,
      userId: quack.userId,
      createdAt: quack.createdAt,
      user: {
        id: quack.user.id,
        name: quack.user.name,
        username: quack.user.username,
      },
      threadId: quack.threadId,
      replyToId: quack.replyToId,
      // Only a reply to another reply says who it answers; a reply straight
      // to the quack has no "in reply to" line.
      replyToUser:
        quack.replyToId !== quack.threadId ? quack.replyToUser : null,
      replyCount: quack.replyCount,
      poll: quack.poll ? PollResponseDto.fromDomain(quack.poll) : null,
    };
  }
}
