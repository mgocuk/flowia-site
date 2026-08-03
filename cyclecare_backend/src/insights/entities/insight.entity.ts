import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('insights')
export class Insight {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  type: string;

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({ default: false })
  isPremium: boolean;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  generatedAt: Date;
}
