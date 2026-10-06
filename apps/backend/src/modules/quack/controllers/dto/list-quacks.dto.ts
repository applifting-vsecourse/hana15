import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

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
}
