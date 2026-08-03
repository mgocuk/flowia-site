import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays } from 'date-fns';
import { Cycle } from './entities/cycle.entity';
import { PeriodEntry } from './entities/period-entry.entity';
import { CreateCycleDto } from './dto/create-cycle.dto';
import { CreatePeriodEntryDto } from './dto/create-period-entry.dto';

@Injectable()
export class CyclesService {
  constructor(
    @InjectRepository(Cycle)
    private readonly cycleRepository: Repository<Cycle>,
    @InjectRepository(PeriodEntry)
    private readonly periodRepository: Repository<PeriodEntry>,
  ) {}

  async findAll(userId: string): Promise<Cycle[]> {
    return this.cycleRepository.find({ where: { userId }, order: { predictedStartDate: 'DESC' } });
  }

  async findCurrent(userId: string): Promise<Cycle> {
    const cycle = await this.cycleRepository.findOne({
      where: { userId },
      order: { predictedStartDate: 'DESC' },
    });
    if (!cycle) throw new NotFoundException('No current cycle found');
    return cycle;
  }

  async findOne(userId: string, id: string): Promise<Cycle> {
    const cycle = await this.cycleRepository.findOne({ where: { id, userId } });
    if (!cycle) throw new NotFoundException('Cycle not found');
    return cycle;
  }

  async create(userId: string, dto: CreateCycleDto): Promise<Cycle> {
    const cycle = this.cycleRepository.create({ ...dto, userId });
    return this.cycleRepository.save(cycle);
  }

  async update(userId: string, id: string, dto: Partial<CreateCycleDto>): Promise<Cycle> {
    const cycle = await this.findOne(userId, id);
    Object.assign(cycle, dto);
    return this.cycleRepository.save(cycle);
  }

  async getPeriods(userId: string, cycleId: string): Promise<PeriodEntry[]> {
    return this.periodRepository.find({ where: { cycleId, userId }, order: { date: 'ASC' } });
  }

  async addPeriodEntry(userId: string, cycleId: string, dto: CreatePeriodEntryDto): Promise<PeriodEntry> {
    const entry = this.periodRepository.create({ ...dto, cycleId, userId });
    return this.periodRepository.save(entry);
  }

  async updatePeriodEntry(userId: string, entryId: string, dto: Partial<CreatePeriodEntryDto>): Promise<PeriodEntry> {
    const entry = await this.periodRepository.findOne({ where: { id: entryId, userId } });
    if (!entry) throw new NotFoundException('Entry not found');
    Object.assign(entry, dto);
    return this.periodRepository.save(entry);
  }

  async deletePeriodEntry(userId: string, entryId: string): Promise<void> {
    const entry = await this.periodRepository.findOne({ where: { id: entryId, userId } });
    if (!entry) throw new NotFoundException('Entry not found');
    await this.periodRepository.remove(entry);
  }

  async getPredictions(userId: string) {
    const cycles = await this.cycleRepository.find({ where: { userId }, order: { actualStartDate: 'DESC' }, take: 5 });
    
    // Default values if no history
    let avgLength = 28;
    let lastStart = new Date();
    
    if (cycles.length > 0 && cycles[0].actualStartDate) {
      lastStart = new Date(cycles[0].actualStartDate);
      // Calculate avg length from history
      const validCycles = cycles.filter(c => c.cycleLength);
      if (validCycles.length > 0) {
        avgLength = Math.round(validCycles.reduce((sum, c) => sum + (c.cycleLength || 28), 0) / validCycles.length);
      }
    }

    const predictions = [];
    let currentStart = lastStart;

    for (let i = 0; i < 3; i++) {
      currentStart = addDays(currentStart, avgLength);
      const predictedEnd = addDays(currentStart, avgLength - 1);
      const ovulationDate = addDays(currentStart, Math.round(avgLength / 2) - 1); // rough estimate
      
      predictions.push({
        predictedStart: currentStart,
        predictedEnd: predictedEnd,
        ovulationDate: ovulationDate,
        fertileWindowStart: addDays(ovulationDate, -4),
        fertileWindowEnd: addDays(ovulationDate, 1),
        confidenceScore: cycles.length > 3 ? 'High' : (cycles.length > 0 ? 'Medium' : 'Low'),
      });
    }

    return predictions;
  }
}
