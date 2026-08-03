import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('moods')
export class Mood {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ type: 'int' })
  moodScore: number;

  @Column({ type: 'int' })
  energyLevel: number;

  @Column({ type: 'int', nullable: true })
  libitoLevel: number;

  @Column('text', { nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;
}
