import { IsDateString, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMoodDto {
  @ApiProperty()
  @IsDateString()
  date: Date;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  moodScore: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  energyLevel: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  libitoLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
