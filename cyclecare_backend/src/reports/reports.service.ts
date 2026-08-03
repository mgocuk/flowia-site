import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './entities/report.entity';
import { CyclesService } from '../cycles/cycles.service';
import { SymptomsService } from '../symptoms/symptoms.service';
import { MoodsService } from '../moods/moods.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,
    private readonly cyclesService: CyclesService,
    private readonly symptomsService: SymptomsService,
    private readonly moodsService: MoodsService,
  ) {}

  async findAll(userId: string) {
    return this.reportRepository.find({ where: { userId }, order: { generatedAt: 'DESC' } });
  }

  async findOne(userId: string, id: string) {
    const report = await this.reportRepository.findOne({ where: { id, userId } });
    if (!report) throw new NotFoundException('Report not found');
    return report;
  }

  async generateMonthlyReport(userId: string, month: number, year: number) {
    // Generate complex statistics (mocked logic for brevity)
    const content = {
      healthScore: 85,
      cycleRegularityScore: 'High',
      avgMood: 4.2,
      topSymptoms: ['Cramps', 'Headache'],
      month,
      year,
      summary: 'Your cycle was very regular this month with generally positive moods.',
    };

    const report = this.reportRepository.create({
      userId,
      type: 'monthly',
      periodStart: new Date(year, month - 1, 1),
      periodEnd: new Date(year, month, 0),
      contentJson: content,
    });

    return this.reportRepository.save(report);
  }

  async generateYearlyReport(userId: string, year: number) {
    const content = {
      healthScore: 88,
      cycleRegularityScore: 'High',
      avgMood: 4.0,
      topSymptoms: ['Cramps', 'Bloating'],
      year,
      summary: 'A great year overall with consistent cycles.',
    };

    const report = this.reportRepository.create({
      userId,
      type: 'yearly',
      periodStart: new Date(year, 0, 1),
      periodEnd: new Date(year, 11, 31),
      contentJson: content,
    });

    return this.reportRepository.save(report);
  }

  async exportReport(userId: string, id: string) {
    const report = await this.findOne(userId, id);
    // Returns formatted JSON suitable for client-side PDF generation
    return {
      pdfMetadata: {
        title: `CycleCare ${report.type} Report`,
        author: 'CycleCare App',
        createdDate: report.generatedAt,
      },
      content: report.contentJson,
    };
  }
}
