import { DataSource } from 'typeorm';
import { SubscriptionPlan } from '../entities/subscription-plan.entity';
import { AppDataSource } from '../data-source';

async function seed() {
  await AppDataSource.initialize();
  const planRepo = AppDataSource.getRepository(SubscriptionPlan);

  const plans = [
    {
      name: 'free',
      priceMonthly: 0,
      priceAnnual: 0,
      features: { maxCycles: 3, ads: true },
    },
    {
      name: 'premium_monthly',
      priceMonthly: 5.99,
      priceAnnual: 0,
      features: { maxCycles: -1, ads: false, advancedInsights: true },
    },
    {
      name: 'premium_annual',
      priceMonthly: 0,
      priceAnnual: 39.99,
      features: { maxCycles: -1, ads: false, advancedInsights: true },
    },
  ];

  for (const p of plans) {
    const existing = await planRepo.findOne({ where: { name: p.name } });
    if (!existing) {
      const plan = planRepo.create(p);
      await planRepo.save(plan);
      console.log(`Created plan: ${p.name}`);
    }
  }

  await AppDataSource.destroy();
  console.log('Seeding complete.');
}

seed().catch(console.error);
