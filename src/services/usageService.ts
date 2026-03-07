import prisma from '../prismaClient.js';

/**
 * Get the current billing period boundaries for an organization.
 * Falls back to the current calendar month if no active subscription exists.
 */
const getCurrentPeriod = async (orgId: number): Promise<{ start: Date; end: Date }> => {
    const subscription = await prisma.subscription.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
    });

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
export const trackUsage = async (
    orgId: number,
    key: string,
    increment: number = 1
) => {
    const { start, end } = await getCurrentPeriod(orgId);

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

/**
 * Get current period usage for an organization.
 * If key is provided, returns a single metric; otherwise returns all metrics.
 */
export const getUsage = async (orgId: number, key?: string) => {
    const { start } = await getCurrentPeriod(orgId);

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
};

/**
 * Check if an organization has exceeded the limit for a given usage key.
 * Returns { allowed, limit, current }.
 */
export const checkLimit = async (
    orgId: number,
    usageKey: string,
    featureKey: string
): Promise<{ allowed: boolean; limit: number | null; current: number }> => {
    // Get plan feature limit
    const subscription = await prisma.subscription.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        include: {
            plan: {
                include: {
                    features: { where: { featureKey: featureKey as any } },
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
    const { start } = await getCurrentPeriod(orgId);
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
