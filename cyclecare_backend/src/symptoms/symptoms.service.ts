import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Symptom } from './entities/symptom.entity';
import { CreateSymptomDto } from './dto/create-symptom.dto';

@Injectable()
export class SymptomsService {
  constructor(
    @InjectRepository(Symptom)
    private readonly symptomRepository: Repository<Symptom>,
  ) {}

  findAll(userId: string) {
    return this.symptomRepository.find({ where: { userId }, order: { date: 'DESC' } });
  }

  findByDate(userId: string, date: Date) {
    return this.symptomRepository.find({ where: { userId, date } });
  }

  create(userId: string, dto: CreateSymptomDto) {
    const symptom = this.symptomRepository.create({ ...dto, userId });
    return this.symptomRepository.save(symptom);
  }

  async update(userId: string, id: string, dto: Partial<CreateSymptomDto>) {
    const symptom = await this.symptomRepository.findOne({ where: { id, userId } });
    if (!symptom) throw new NotFoundException('Symptom not found');
    Object.assign(symptom, dto);
    return this.symptomRepository.save(symptom);
  }

  async remove(userId: string, id: string) {
    const symptom = await this.symptomRepository.findOne({ where: { id, userId } });
    if (!symptom) throw new NotFoundException('Symptom not found');
    await this.symptomRepository.remove(symptom);
  }
}
