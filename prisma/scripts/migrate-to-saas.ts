/**
 * Data migration script: Migrate existing data to SaaS multi-tenant model.
 *
 * Steps:
 * 1. Seed default plans (FREE, TEACHER_PRO, SCHOOL, ENTERPRISE) with features
 * 2. For each User: create a default Organization, add as OWNER, create FREE subscription
 * 3. Backfill organizationId on existing Quiz/Match/Classroom/AIGenerationJob
 *
 * Usage:
 *   npx ts-node prisma/scripts/migrate-to-saas.ts
 */

import { PrismaClient, PlanType, FeatureKey, OrganizationRole, BillingCycle, SubscriptionStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ——— Plan Definitions ———

const PLAN_DEFINITIONS = [
    {
        type: PlanType.FREE,
        name: 'Free',
        description: 'Get started with basic features',
        priceMonthly: 0,
        priceYearly: 0,
        features: [
            { featureKey: FeatureKey.AI_GENERATION, enabled: true, limit: 5 },
            { featureKey: FeatureKey.UNLIMITED_MATCHES, enabled: false, limit: 10 },
            { featureKey: FeatureKey.ADVANCED_ANALYTICS, enabled: false, limit: null },
            { featureKey: FeatureKey.UNLIMITED_CLASSROOMS, enabled: false, limit: 3 },
            { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, enabled: true, limit: 30 },
            { featureKey: FeatureKey.CUSTOM_BRANDING, enabled: false, limit: null },
            { featureKey: FeatureKey.PRIORITY_SUPPORT, enabled: false, limit: null },
        ],
    },
    {
        type: PlanType.TEACHER_PRO,
        name: 'Teacher Pro',
        description: 'Everything a teacher needs',
        priceMonthly: 9.99,
        priceYearly: 99.99,
        features: [
            { featureKey: FeatureKey.AI_GENERATION, enabled: true, limit: 50 },
            { featureKey: FeatureKey.UNLIMITED_MATCHES, enabled: true, limit: null },
            { featureKey: FeatureKey.ADVANCED_ANALYTICS, enabled: true, limit: null },
            { featureKey: FeatureKey.UNLIMITED_CLASSROOMS, enabled: true, limit: null },
            { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, enabled: true, limit: 100 },
            { featureKey: FeatureKey.CUSTOM_BRANDING, enabled: false, limit: null },
            { featureKey: FeatureKey.PRIORITY_SUPPORT, enabled: false, limit: null },
        ],
    },
    {
        type: PlanType.SCHOOL,
        name: 'School',
        description: 'For schools and training centers',
        priceMonthly: 49.99,
        priceYearly: 499.99,
        features: [
            { featureKey: FeatureKey.AI_GENERATION, enabled: true, limit: 500 },
            { featureKey: FeatureKey.UNLIMITED_MATCHES, enabled: true, limit: null },
            { featureKey: FeatureKey.ADVANCED_ANALYTICS, enabled: true, limit: null },
            { featureKey: FeatureKey.UNLIMITED_CLASSROOMS, enabled: true, limit: null },
            { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, enabled: true, limit: 500 },
            { featureKey: FeatureKey.CUSTOM_BRANDING, enabled: true, limit: null },
            { featureKey: FeatureKey.PRIORITY_SUPPORT, enabled: true, limit: null },
        ],
    },
    {
        type: PlanType.ENTERPRISE,
        name: 'Enterprise',
        description: 'Unlimited everything for large organizations',
        priceMonthly: 199.99,
        priceYearly: 1999.99,
        features: [
            { featureKey: FeatureKey.AI_GENERATION, enabled: true, limit: null },
            { featureKey: FeatureKey.UNLIMITED_MATCHES, enabled: true, limit: null },
            { featureKey: FeatureKey.ADVANCED_ANALYTICS, enabled: true, limit: null },
            { featureKey: FeatureKey.UNLIMITED_CLASSROOMS, enabled: true, limit: null },
            { featureKey: FeatureKey.MAX_PLAYERS_PER_MATCH, enabled: true, limit: null },
            { featureKey: FeatureKey.CUSTOM_BRANDING, enabled: true, limit: null },
            { featureKey: FeatureKey.PRIORITY_SUPPORT, enabled: true, limit: null },
        ],
    },
];

// ——— Helpers ———

function generateSlug(name: string): string {
    const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
}

// ——— Main Migration ———

async function main() {
    console.log('🚀 Starting SaaS migration...\n');

    // Step 1: Seed plans
    console.log('📋 Step 1: Seeding plans...');
    const planMap = new Map<PlanType, number>();

    for (const planDef of PLAN_DEFINITIONS) {
        const plan = await prisma.plan.upsert({
            where: { type: planDef.type },
            update: {
                name: planDef.name,
                description: planDef.description,
                priceMonthly: planDef.priceMonthly,
                priceYearly: planDef.priceYearly,
            },
            create: {
                type: planDef.type,
                name: planDef.name,
                description: planDef.description,
                priceMonthly: planDef.priceMonthly,
                priceYearly: planDef.priceYearly,
            },
        });

        planMap.set(planDef.type, plan.id);

        // Upsert features
        for (const feat of planDef.features) {
            await prisma.planFeature.upsert({
                where: {
                    planId_featureKey: { planId: plan.id, featureKey: feat.featureKey },
                },
                update: { enabled: feat.enabled, limit: feat.limit },
                create: {
                    planId: plan.id,
                    featureKey: feat.featureKey,
                    enabled: feat.enabled,
                    limit: feat.limit,
                },
            });
        }

        console.log(`  ✅ Plan "${planDef.name}" seeded with ${planDef.features.length} features`);
    }

    const freePlanId = planMap.get(PlanType.FREE)!;

    // Step 2: Create organizations for existing users
    console.log('\n👥 Step 2: Creating organizations for existing users...');
    const users = await prisma.user.findMany();
    const userOrgMap = new Map<number, number>(); // userId -> organizationId

    for (const user of users) {
        // Skip if user already has an organization
        const existingMembership = await prisma.organizationMember.findFirst({
            where: { userId: user.id },
        });

        if (existingMembership) {
            userOrgMap.set(user.id, existingMembership.organizationId);
            console.log(`  ⏭️  User "${user.username || user.email}" already has an org`);
            continue;
        }

        const orgName = `${user.username || user.email}'s Workspace`;
        const slug = generateSlug(orgName);

        const org = await prisma.organization.create({
            data: {
                name: orgName,
                slug,
                members: {
                    create: {
                        userId: user.id,
                        role: OrganizationRole.OWNER,
                    },
                },
            },
        });

        userOrgMap.set(user.id, org.id);

        // Create FREE subscription
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await prisma.subscription.create({
            data: {
                organizationId: org.id,
                planId: freePlanId,
                billingCycle: BillingCycle.MONTHLY,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
        });

        console.log(`  ✅ Created org "${orgName}" for user "${user.username || user.email}"`);
    }

    // Step 3: Backfill organizationId
    console.log('\n🔗 Step 3: Backfilling organizationId on resources...');

    // Quizzes
    const quizzes = await prisma.quiz.findMany({ where: { organizationId: null } });
    let updated = 0;
    for (const quiz of quizzes) {
        const orgId = userOrgMap.get(quiz.creatorId);
        if (orgId) {
            await prisma.quiz.update({
                where: { id: quiz.id },
                data: { organizationId: orgId },
            });
            updated++;
        }
    }
    console.log(`  ✅ Updated ${updated}/${quizzes.length} quizzes`);

    // Matches
    const matches = await prisma.match.findMany({ where: { organizationId: null } });
    updated = 0;
    for (const match of matches) {
        const orgId = userOrgMap.get(match.hostId);
        if (orgId) {
            await prisma.match.update({
                where: { id: match.id },
                data: { organizationId: orgId },
            });
            updated++;
        }
    }
    console.log(`  ✅ Updated ${updated}/${matches.length} matches`);

    // Classrooms
    const classrooms = await prisma.classroom.findMany({ where: { organizationId: null } });
    updated = 0;
    for (const classroom of classrooms) {
        const orgId = userOrgMap.get(classroom.teacherId);
        if (orgId) {
            await prisma.classroom.update({
                where: { id: classroom.id },
                data: { organizationId: orgId },
            });
            updated++;
        }
    }
    console.log(`  ✅ Updated ${updated}/${classrooms.length} classrooms`);

    // AI Generation Jobs
    const aiJobs = await prisma.aIGenerationJob.findMany({ where: { organizationId: null } });
    updated = 0;
    for (const job of aiJobs) {
        const orgId = userOrgMap.get(job.userId);
        if (orgId) {
            await prisma.aIGenerationJob.update({
                where: { id: job.id },
                data: { organizationId: orgId },
            });
            updated++;
        }
    }
    console.log(`  ✅ Updated ${updated}/${aiJobs.length} AI generation jobs`);

    console.log('\n🎉 Migration complete!');
}

main()
    .catch((e) => {
        console.error('❌ Migration failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
