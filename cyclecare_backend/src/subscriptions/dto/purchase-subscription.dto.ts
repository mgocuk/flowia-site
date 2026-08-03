import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Platform } from '../entities/user-subscription.entity';

export class PurchaseSubscriptionDto {
  @ApiProperty()
  @IsString()
  planId: string;

  @ApiProperty({ enum: Platform })
  @IsEnum(Platform)
  platform: Platform;

  @ApiProperty()
  @IsString()
  transactionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptData?: string;
}
