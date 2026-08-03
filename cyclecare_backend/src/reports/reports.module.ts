import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Report } from './entities/report.entity';
import { CyclesModule } from '../cycles/cycles.module';
import { SymptomsModule } from '../symptoms/symptoms.module';
import { MoodsModule } from '../moods/moods.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Report]),
    CyclesModule,
    SymptomsModule,
    MoodsModule,
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
