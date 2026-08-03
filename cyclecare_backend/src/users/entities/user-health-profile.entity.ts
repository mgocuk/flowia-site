import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum PregnancyStatus {
  NOT_PREGNANT = 'not_pregnant',
  TRYING = 'trying',
  PREGNANT = 'pregnant',
}

@Entity('user_health_profiles')
export class UserHealthProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'int', default: 28 })
  avgCycleLength: number;

  @Column({ type: 'int', default: 5 })
  avgPeriodDuration: number;

  @Column({ default: false })
  hasPcos: boolean;

  @Column({ default: false })
  hasEndometriosis: boolean;

  @Column({ nullable: true })
  birthControlType: string;

  @Column({ type: 'enum', enum: PregnancyStatus, default: PregnancyStatus.NOT_PREGNANT })
  pregnancyStatus: PregnancyStatus;

  @Column('text', { array: true, default: [] })
  goals: string[];

  @Column({ type: 'date', nullable: true })
  lastPeriodDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
