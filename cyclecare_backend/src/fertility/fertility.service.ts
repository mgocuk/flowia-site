import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { differenceInDays, addDays } from 'date-fns';
import { FertilityData, ConceptionChance } from './entities/fertility-data.entity';
import { CyclesService } from '../cycles/cycles.service';

@Injectable()
export class FertilityService {
  constructor(
    @InjectRepository(FertilityData)
    private readonly fertilityRepository: Repository<FertilityData>,
    private readonly cyclesService: CyclesService,
  ) {}

  async getCurrentFertility(userId: string) {
    const currentCycle = await this.cyclesService.findCurrent(userId);
    if (!currentCycle.actualStartDate) {
      throw new NotFoundException('Current cycle start date is unknown');
    }

    const today = new Date();
    const cycleDay = differenceInDays(today, new Date(currentCycle.actualStartDate)) + 1;
    const cycleLength = currentCycle.cycleLength || 28;
    
    // Estimate ovulation
    const ovulationDay = cycleLength - 14;
    let conceptionChance = ConceptionChance.LOW;
    
    if (cycleDay === ovulationDay) {
      conceptionChance = ConceptionChance.PEAK;
    } else if (cycleDay >= ovulationDay - 4 && cycleDay <= ovulationDay + 1) {
      conceptionChance = ConceptionChance.HIGH;
    } else if (cycleDay > cycleLength || cycleDay < ovulationDay - 7) {
      conceptionChance = ConceptionChance.VERY_LOW;
    }

    return {
      cycleDay,
      conceptionChance,
      ovulationDay,
      estimatedOvulationDate: addDays(new Date(currentCycle.actualStartDate), ovulationDay - 1),
    };
  }

  async getHistory(userId: string) {
    return this.fertilityRepository.find({ where: { userId } });
  }
}
