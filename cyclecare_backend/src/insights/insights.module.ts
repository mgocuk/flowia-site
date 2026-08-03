import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';
import { Insight } from './entities/insight.entity';
import { CyclesModule } from '../cycles/cycles.module';
import { SymptomsModule } from '../symptoms/symptoms.module';
import { MoodsModule } from '../moods/moods.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Insight]),
    CyclesModule,
    SymptomsModule,
    MoodsModule,
    SubscriptionsModule,
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
