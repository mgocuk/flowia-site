import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { User } from '../users/entities/user.entity';
import { UserHealthProfile } from '../users/entities/user-health-profile.entity';
import { Cycle } from '../cycles/entities/cycle.entity';
import { PeriodEntry } from '../cycles/entities/period-entry.entity';
import { Symptom } from '../symptoms/entities/symptom.entity';
import { Mood } from '../moods/entities/mood.entity';
import { FertilityData } from '../fertility/entities/fertility-data.entity';
import { Journal } from '../journals/entities/journal.entity';
import { Report } from '../reports/entities/report.entity';
import { SubscriptionPlan } from '../subscriptions/entities/subscription-plan.entity';
import { UserSubscription } from '../subscriptions/entities/user-subscription.entity';
import { Insight } from '../insights/entities/insight.entity';
import { Notification } from '../notifications/entities/notification.entity';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres',
  database: process.env.DATABASE_NAME || 'cyclecare',
  synchronize: false,
  logging: true,
  entities: [
    User, UserHealthProfile, Cycle, PeriodEntry, Symptom, Mood,
    FertilityData, Journal, Report, SubscriptionPlan, UserSubscription,
    Insight, Notification
  ],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  subscribers: [],
});
