import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoodsService } from './moods.service';
import { MoodsController } from './moods.controller';
import { Mood } from './entities/mood.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Mood])],
  controllers: [MoodsController],
  providers: [MoodsService],
  exports: [MoodsService],
})
export class MoodsModule {}
