import prisma from '../prismaClient.js';
import { FeatureKey } from '@prisma/client';

interface FeatureStatus {
    featureKey: FeatureKey;
    allowed: boolean;
    enabled: boolean;
    limit: number | null;
}

/**
 * Check if an organization can use a specific feature based on their active plan.
 */
export const canUseFeature = async (
    orgId: number,
    featureKey: FeatureKey
): Promise<FeatureStatus> => {
    const subscription = await prisma.subscription.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        include: {
            plan: {
                include: {
                    features: { where: { featureKey } },
                },
            },
        },
    });

    if (!subscription) {
        return { featureKey, allowed: false, enabled: false, limit: null };
    }

    const feature = subscription.plan.features[0];
    if (!feature || !feature.enabled) {
        return { featureKey, allowed: false, enabled: false, limit: feature?.limit ?? null };
    }

    return {
        featureKey,
        allowed: true,
        enabled: true,
        limit: feature.limit,
    };
};

/**
 * Get all feature statuses for an organization based on their active plan.
 */
export const getOrgFeatures = async (orgId: number): Promise<FeatureStatus[]> => {
    const subscription = await prisma.subscription.findFirst({
        where: { organizationId: orgId, status: 'ACTIVE' },
        include: {
            plan: {
                include: { features: true },
            },
        },
    });

    if (!subscription) {
        // Return all features as disabled
        return Object.values(FeatureKey).map((key) => ({
            featureKey: key,
            allowed: false,
            enabled: false,
            limit: null,
        }));
    }

    const planFeatures = subscription.plan.features;

    return Object.values(FeatureKey).map((key) => {
        const feature = planFeatures.find((f) => f.featureKey === key);
        return {
            featureKey: key,
            allowed: feature?.enabled ?? false,
            enabled: feature?.enabled ?? false,
            limit: feature?.limit ?? null,
        };
    });
};
