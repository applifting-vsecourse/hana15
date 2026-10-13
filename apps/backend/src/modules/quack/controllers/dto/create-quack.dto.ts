import {
  Mood,
  MOODS,
  POLL_MAX_OPTIONS,
  POLL_MIN_OPTIONS,
  POLL_OPTION_MAX_LENGTH,
} from '@/modules/quack/domain/quack';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateQuackDto {
  @ApiProperty({
    description: 'Body of the quack',
    example: 'Hello, world!',
    maxLength: 280,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(280)
  text!: string;

  @ApiPropertyOptional({
    description: 'How the author feels about the quack',
    enum: MOODS,
    example: 'silly',
  })
  @IsOptional()
  @IsIn(MOODS)
  mood?: Mood;

  @ApiPropertyOptional({
    description:
      'Answers to choose from. When present, the quack is a poll and its text is the question.',
    type: [String],
    example: ['Thai', 'Pizza'],
    minItems: POLL_MIN_OPTIONS,
    maxItems: POLL_MAX_OPTIONS,
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(POLL_MIN_OPTIONS)
  @ArrayMaxSize(POLL_MAX_OPTIONS)
  @Transform(({ value }: { value: unknown }) =>
    Array.isArray(value)
      ? value.map((option: unknown) =>
          typeof option === 'string' ? option.trim() : option,
        )
      : value,
  )
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(POLL_OPTION_MAX_LENGTH, { each: true })
  pollOptions?: string[];
}
