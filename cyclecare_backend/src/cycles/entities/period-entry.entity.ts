import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum FlowIntensity {
  SPOTTING = 'spotting',
  LIGHT = 'light',
  MEDIUM = 'medium',
  HEAVY = 'heavy',
}

@Entity('period_entries')
export class PeriodEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  cycleId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'enum', enum: FlowIntensity })
  flowIntensity: FlowIntensity;

  @Column({ default: false })
  hasSpotting: boolean;

  @Column({ default: false })
  hasClotting: boolean;

  @Column({ type: 'int', default: 0 })
  painLevel: number;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
