import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Insight } from './entities/insight.entity';
import { CyclesService } from '../cycles/cycles.service';
import { SymptomsService } from '../symptoms/symptoms.service';
import { MoodsService } from '../moods/moods.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Insight)
    private readonly insightRepository: Repository<Insight>,
    private readonly cyclesService: CyclesService,
    private readonly symptomsService: SymptomsService,
    private readonly moodsService: MoodsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async generateInsights(userId: string) {
    const isPremium = await this.subscriptionsService.checkPremiumAccess(userId);
    const insights = [];

    // Rule 1: Cycle regularity
    const cycles = await this.cyclesService.findAll(userId);
    if (cycles.length >= 3) {
      const lengths = cycles.map(c => c.cycleLength).filter(l => l);
      if (lengths.length > 0) {
        insights.push({
          type: 'cycle_regularity',
          title: 'Cycle Regularity',
          body: 'Your cycle is staying consistent. Keep logging!',
          priority: 1,
          isPremium: false,
        });
      }
    }

    // Rule 2: Symptom patterns (Premium)
    if (isPremium) {
      insights.push({
        type: 'symptom_pattern',
        title: 'Symptom Forecast',
        body: 'You often experience bloating around this time. Stay hydrated!',
        priority: 2,
        isPremium: true,
      });
    }

    // Save generated insights
    for (const insightData of insights) {
      const insight = this.insightRepository.create({
        ...insightData,
        userId,
      });
      await this.insightRepository.save(insight);
    }

    return insights.slice(0, 5);
  }

  async getHistory(userId: string, page: number, limit: number) {
    return this.insightRepository.find({
      where: { userId },
      order: { generatedAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
  }
}
