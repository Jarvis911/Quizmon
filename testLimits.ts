import prisma from './src/prismaClient.js';
import { trackUsage, checkLimit } from './src/services/usageService.js';
import { FeatureKey } from '@prisma/client';

async function main() {
    // 1. Get FREE plan
    const plan = await prisma.plan.findUnique({ where: { type: 'FREE' } });
    if (!plan) throw new Error("FREE plan not found");

    // 2. Create a test user and org
    const user = await prisma.user.create({
        data: {
            email: `test_${Date.now()}@quizmon.com`,
            username: 'testuser'
        }
    });

    const org = await prisma.organization.create({
        data: {
            name: 'Test Org',
            slug: `test-org-${Date.now()}`
        }
    });

    // 3. Create Subscription for the org
    await prisma.subscription.create({
        data: {
            organizationId: org.id,
            planId: plan.id,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
    });

    // 4. Test limits
    console.log("Testing matches_hosted limit for FREE plan...");

    for (let i = 1; i <= 6; i++) {
        const { allowed, limit, current } = await checkLimit(
            org.id,
            'matches_hosted',
            FeatureKey.UNLIMITED_MATCHES
        );

        console.log(`Match ${i} attempt: allowed=${allowed}, current=${current}, limit=${limit}`);

        if (allowed) {
            await trackUsage(org.id, 'matches_hosted', 1);
            console.log(`Tracked match ${i}.`);
        } else {
            console.log(`Match ${i} DENIED. Reached limit!`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
