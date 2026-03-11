import prisma from '../prismaClient.js';
/**
 * Get the current billing period boundaries for an organization.
 * Falls back to the current calendar month if no active subscription exists.
 * Supports "daily" periods for specific keys (e.g. AI generation on FREE plan).
 */
const getCurrentPeriod = async (orgId, key) => {
    const subscription = await prisma.subscription.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
    });
    // Strategy: AI Generation and matches on FREE plan is DAILY
    if ((key === 'ai_generations' || key === 'matches_hosted') && subscription?.plan?.type === 'FREE') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        return { start, end };
    }
    if (subscription) {
        return {
            start: subscription.currentPeriodStart,
            end: subscription.currentPeriodEnd,
        };
    }
    // Default to current calendar month
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
};
/**
 * Track (increment) a usage metric for an organization in the current billing period.
 * Uses upsert to create or increment the counter atomically.
 */
export const trackUsage = async (orgId, key, increment = 1) => {
    const { start, end } = await getCurrentPeriod(orgId, key);
    return prisma.usageMetric.upsert({
        where: {
            organizationId_key_periodStart: {
                organizationId: orgId,
                key,
                periodStart: start,
            },
        },
        update: {
            value: { increment },
        },
        create: {
            organizationId: orgId,
            key,
            value: increment,
            periodStart: start,
            periodEnd: end,
        },
    });
};
export async function getUsage(orgId, key) {
    const { start } = await getCurrentPeriod(orgId, key);
    if (key) {
        const metric = await prisma.usageMetric.findUnique({
            where: {
                organizationId_key_periodStart: {
                    organizationId: orgId,
                    key,
                    periodStart: start,
                },
            },
        });
        return metric ?? { key, value: 0, periodStart: start };
    }
    return prisma.usageMetric.findMany({
        where: { organizationId: orgId, periodStart: start },
    });
}
;
/**
 * Check if an organization has exceeded the limit for a given usage key.
 * Returns { allowed, limit, current }.
 */
export const checkLimit = async (orgId, usageKey, featureKey) => {
    // Get plan feature limit
    const subscription = await prisma.subscription.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        include: {
            plan: {
                include: {
                    features: { where: { featureKey: featureKey } },
                },
            },
        },
    });
    const feature = subscription?.plan?.features?.[0];
    const limit = feature?.limit ?? null; // null means unlimited
    const enabled = feature?.enabled ?? false;
    if (!enabled) {
        return { allowed: false, limit: 0, current: 0 };
    }
    if (limit === null) {
        return { allowed: true, limit: null, current: 0 };
    }
    // Get current usage
    const { start } = await getCurrentPeriod(orgId, usageKey);
    const metric = await prisma.usageMetric.findUnique({
        where: {
            organizationId_key_periodStart: {
                organizationId: orgId,
                key: usageKey,
                periodStart: start,
            },
        },
    });
    const current = metric?.value ?? 0;
    return { allowed: current < limit, limit, current };
};
