import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Journal } from './entities/journal.entity';
import { CreateJournalDto } from './dto/create-journal.dto';

@Injectable()
export class JournalsService {
  constructor(
    @InjectRepository(Journal)
    private readonly journalRepository: Repository<Journal>,
  ) {}

  async findAll(userId: string, page: number, limit: number) {
    const [data, total] = await this.journalRepository.findAndCount({
      where: { userId },
      order: { date: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async findOne(userId: string, id: string) {
    const journal = await this.journalRepository.findOne({ where: { id, userId } });
    if (!journal) throw new NotFoundException('Journal not found');
    return journal;
  }

  create(userId: string, dto: CreateJournalDto) {
    const journal = this.journalRepository.create({ ...dto, userId });
    return this.journalRepository.save(journal);
  }

  async update(userId: string, id: string, dto: Partial<CreateJournalDto>) {
    const journal = await this.findOne(userId, id);
    Object.assign(journal, dto);
    return this.journalRepository.save(journal);
  }

  async remove(userId: string, id: string) {
    const journal = await this.findOne(userId, id);
    await this.journalRepository.softRemove(journal);
  }
}
