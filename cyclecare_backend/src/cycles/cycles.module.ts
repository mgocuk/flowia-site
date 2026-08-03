import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CyclesService } from './cycles.service';
import { CyclesController } from './cycles.controller';
import { Cycle } from './entities/cycle.entity';
import { PeriodEntry } from './entities/period-entry.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Cycle, PeriodEntry])],
  controllers: [CyclesController],
  providers: [CyclesService],
  exports: [CyclesService],
})
export class CyclesModule {}
