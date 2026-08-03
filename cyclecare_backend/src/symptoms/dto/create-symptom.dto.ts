import { IsDateString, IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSymptomDto {
  @ApiProperty()
  @IsDateString()
  date: Date;

  @ApiProperty()
  @IsString()
  symptomType: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(5)
  severity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
