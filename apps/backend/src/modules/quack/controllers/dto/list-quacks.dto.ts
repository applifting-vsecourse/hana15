import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ListQuacksDto {
  @ApiPropertyOptional({
    description:
      'Only return quacks whose text or author name contains every word (case-insensitive). Ignored when shorter than 2 characters.',
    example: 'bread pond',
    maxLength: 280,
  })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  q?: string;

  @ApiPropertyOptional({
    description:
      "Only return the signed-in user's own quacks. Who 'me' is comes from the session.",
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  mine?: boolean;
}
