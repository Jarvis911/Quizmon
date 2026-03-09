import { PrismaClient, PlanType, FeatureKey } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('SaaS Seed started...');

    // 1. Create Plans
    const plans = [
        {
            type: PlanType.FREE,
            name: 'Miễn phí',
            description: 'Hoàn hảo để bắt đầu trải nghiệm.',
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
            name: 'Giáo viên Chuyên nghiệp',
            description: 'Công cụ nâng cao cho giáo viên cá nhân.',
            priceMonthly: 99000,
            priceYearly: 990000,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 50, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 50, enabled: true },
            ],
        },
        {
            type: PlanType.SCHOOL,
            name: 'Trường học',
            description: 'Tốt nhất cho các khoa hoặc tổ chức giáo dục.',
            priceMonthly: 499000,
            priceYearly: 4990000,
            isActive: true,
            features: [
                { featureKey: FeatureKey.UNLIMITED_MATCHES, limit: null, enabled: true },
                { featureKey: FeatureKey.AI_GENERATION, limit: 500, enabled: true },
                { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, limit: 200, enabled: true },
            ],
        },
        {
            type: PlanType.ENTERPRISE,
            name: 'Doanh nghiệp',
            description: 'Dành cho các cơ sở giáo dục quy mô lớn.',
            priceMonthly: 1999000,
            priceYearly: 19990000,
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
