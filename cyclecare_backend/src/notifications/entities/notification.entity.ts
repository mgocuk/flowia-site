import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @Column()
  type: string; // 'prediction' | 'insight' | 'reminder' | 'report'

  @Column()
  title: string;

  @Column('text')
  body: string;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ default: false })
  isRead: boolean;

  @Column({ nullable: true })
  fcmMessageId: string;

  @CreateDateColumn()
  createdAt: Date;
}
