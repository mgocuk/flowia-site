import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FertilityService } from './fertility.service';
import { FertilityController } from './fertility.controller';
import { FertilityData } from './entities/fertility-data.entity';
import { CyclesModule } from '../cycles/cycles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FertilityData]),
    CyclesModule,
  ],
  controllers: [FertilityController],
  providers: [FertilityService],
  exports: [FertilityService],
})
export class FertilityModule {}
