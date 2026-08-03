import { IsNumber, IsOptional, IsBoolean, IsString, IsEnum, IsArray, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PregnancyStatus } from '../entities/user-health-profile.entity';

export class UpdateHealthProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  avgCycleLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  avgPeriodDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasPcos?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasEndometriosis?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  birthControlType?: string;

  @ApiPropertyOptional({ enum: PregnancyStatus })
  @IsOptional()
  @IsEnum(PregnancyStatus)
  pregnancyStatus?: PregnancyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  lastPeriodDate?: Date;
}
