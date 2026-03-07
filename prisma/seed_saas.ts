import { PrismaClient, PlanType, FeatureKey } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('SaaS Seed started...');

    // 1. Create Plans
    const plans = [
        {
            type: PlanType.FREE,
            name: 'Free',
            description: 'Perfect for getting started.',
            priceMonthly: 0,
            priceYearly: 0,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: 5, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 3, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 10, enabled: true },
            ],
        },
        {
            type: PlanType.TEACHER_PRO,
            name: 'Teacher Pro',
            description: 'Advanced tools for individual teachers.',
            priceMonthly: 9.99,
            priceYearly: 99.99,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 50, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 50, enabled: true },
            ],
        },
        {
            type: PlanType.SCHOOL,
            name: 'School',
            description: 'Best for entire departments.',
            priceMonthly: 49.99,
            priceYearly: 499.99,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 500, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 200, enabled: true },
            ],
        },
        {
            type: PlanType.ENTERPRISE,
            name: 'Enterprise',
            description: 'For large institutions.',
            priceMonthly: 199.99,
            priceYearly: 1999.99,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: null, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 1000, enabled: true },
            ],
        },
    ];

    for (const p of plans) {
        const { features, ...planData } = p;
        const plan = await prisma.plan.upsert({
            where: { type: p.type },
            update: planData,
            create: planData,
        });

        for (const f of features) {
            await prisma.planFeature.upsert({
                where: {
                    planId_featureKey: {
                        planId: plan.id,
                        featureKey: f.featureKey,
                    },
                },
                update: f,
                create: { ...f, planId: plan.id },
            });
        }
    }

    console.log('SaaS Seed finished successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
