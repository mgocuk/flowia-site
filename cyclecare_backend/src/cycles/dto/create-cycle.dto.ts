import { IsDateString, IsOptional, IsNumber, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCycleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  predictedStartDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualStartDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  predictedEndDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  actualEndDate?: Date;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  cycleLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
