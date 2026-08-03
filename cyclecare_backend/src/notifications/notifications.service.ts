import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findAll(userId: string, unreadOnly: boolean = false, page: number = 1, limit: number = 20) {
    const query: any = { userId };
    if (unreadOnly) {
      query.isRead = false;
    }
    const [data, total] = await this.notificationRepository.findAndCount({
      where: query,
      order: { scheduledAt: 'DESC' },
      take: limit,
      skip: (page - 1) * limit,
    });
    return { data, total, page, limit };
  }

  async markAsRead(userId: string, id: string) {
    const notification = await this.notificationRepository.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.isRead = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }

  async sendPush(userId: string, title: string, body: string) {
    // FCM implementation goes here
    const notification = this.notificationRepository.create({
      userId,
      type: 'general',
      title,
      body,
      scheduledAt: new Date(),
      sentAt: new Date(),
    });
    return this.notificationRepository.save(notification);
  }

  async schedulePeriodReminder(userId: string, predictedDate: Date) {
    const notification = this.notificationRepository.create({
      userId,
      type: 'prediction',
      title: 'Period approaching',
      body: 'Your next period is predicted to start soon.',
      scheduledAt: predictedDate, // In reality, maybe 2 days before
    });
    return this.notificationRepository.save(notification);
  }

  async scheduleDailyReminder(userId: string) {
    // Logic for daily logging reminder
    return true;
  }
}
