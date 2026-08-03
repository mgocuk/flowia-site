import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { addDays, addYears } from 'date-fns';
import { SubscriptionPlan } from './entities/subscription-plan.entity';
import { UserSubscription, SubscriptionStatus } from './entities/user-subscription.entity';
import { PurchaseSubscriptionDto } from './dto/purchase-subscription.dto';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private readonly planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private readonly userSubRepository: Repository<UserSubscription>,
    private readonly usersService: UsersService,
  ) {}

  async getPlans() {
    return this.planRepository.find({ where: { isActive: true } });
  }

  async getCurrentSubscription(userId: string) {
    const sub = await this.userSubRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { expiresAt: 'DESC' },
    });
    if (!sub) return { status: 'free' };
    return sub;
  }

  async purchase(userId: string, dto: PurchaseSubscriptionDto) {
    const plan = await this.planRepository.findOne({ where: { id: dto.planId } });
    if (!plan) throw new NotFoundException('Plan not found');

    // In a real app, verify the receiptData with Apple/Google here

    const expiresAt = plan.name === 'premium_annual' ? addYears(new Date(), 1) : addDays(new Date(), 30);

    const subscription = this.userSubRepository.create({
      userId,
      planId: plan.id,
      status: SubscriptionStatus.ACTIVE,
      platform: dto.platform as any,
      transactionId: dto.transactionId,
      startedAt: new Date(),
      expiresAt,
    });

    await this.userSubRepository.save(subscription);
    await this.usersService.update(userId, { role: UserRole.PREMIUM_USER } as any);

    return subscription;
  }

  async cancel(userId: string) {
    const sub = await this.userSubRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      order: { expiresAt: 'DESC' },
    });
    if (!sub) throw new BadRequestException('No active subscription found');

    sub.status = SubscriptionStatus.CANCELLED;
    await this.userSubRepository.save(sub);
    await this.usersService.update(userId, { role: UserRole.USER } as any);

    return { message: 'Subscription cancelled' };
  }

  async restore(userId: string) {
    // In a real app, restore from Apple/Google
    return { message: 'Subscription restored' };
  }

  async checkPremiumAccess(userId: string): Promise<boolean> {
    const user = await this.usersService.findById(userId);
    return user.role === UserRole.PREMIUM_USER || user.role === UserRole.ADMIN;
  }
}
