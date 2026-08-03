import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export enum ConceptionChance {
  VERY_LOW = 'very_low',
  LOW = 'low',
  HIGH = 'high',
  PEAK = 'peak',
}

@Entity('fertility_data')
export class FertilityData {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  cycleId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'date', nullable: true })
  ovulationDate: Date;

  @Column({ type: 'date', nullable: true })
  fertileWindowStart: Date;

  @Column({ type: 'date', nullable: true })
  fertileWindowEnd: Date;

  @Column({ type: 'enum', enum: ConceptionChance })
  conceptionChance: ConceptionChance;

  @Column('jsonb', { nullable: true })
  bbtReadings: any;
}
