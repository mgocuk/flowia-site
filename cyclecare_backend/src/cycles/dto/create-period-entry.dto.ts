import { IsDateString, IsEnum, IsInt, Min, Max, IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FlowIntensity } from '../entities/period-entry.entity';

export class CreatePeriodEntryDto {
  @ApiProperty()
  @IsDateString()
  date: Date;

  @ApiProperty({ enum: FlowIntensity })
  @IsEnum(FlowIntensity)
  flowIntensity: FlowIntensity;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasSpotting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasClotting?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  painLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
