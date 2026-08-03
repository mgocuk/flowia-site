import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SymptomsService } from './symptoms.service';
import { SymptomsController } from './symptoms.controller';
import { Symptom } from './entities/symptom.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Symptom])],
  controllers: [SymptomsController],
  providers: [SymptomsService],
  exports: [SymptomsService],
})
export class SymptomsModule {}
