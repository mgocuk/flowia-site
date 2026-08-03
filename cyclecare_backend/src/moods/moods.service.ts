import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { Mood } from './entities/mood.entity';
import { CreateMoodDto } from './dto/create-mood.dto';

@Injectable()
export class MoodsService {
  constructor(
    @InjectRepository(Mood)
    private readonly moodRepository: Repository<Mood>,
  ) {}

  findAll(userId: string) {
    return this.moodRepository.find({ where: { userId }, order: { date: 'DESC' } });
  }

  findByMonth(userId: string, monthStr: string) {
    // monthStr in YYYY-MM
    const date = parseISO(`${monthStr}-01`);
    return this.moodRepository.find({
      where: {
        userId,
        date: Between(startOfMonth(date), endOfMonth(date)),
      },
      order: { date: 'ASC' },
    });
  }

  create(userId: string, dto: CreateMoodDto) {
    const mood = this.moodRepository.create({ ...dto, userId });
    return this.moodRepository.save(mood);
  }

  async update(userId: string, id: string, dto: Partial<CreateMoodDto>) {
    const mood = await this.moodRepository.findOne({ where: { id, userId } });
    if (!mood) throw new NotFoundException('Mood not found');
    Object.assign(mood, dto);
    return this.moodRepository.save(mood);
  }

  async remove(userId: string, id: string) {
    const mood = await this.moodRepository.findOne({ where: { id, userId } });
    if (!mood) throw new NotFoundException('Mood not found');
    await this.moodRepository.remove(mood);
  }
}
