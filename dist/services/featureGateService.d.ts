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
export declare const canUseFeature: (orgId: number, featureKey: FeatureKey) => Promise<FeatureStatus>;
/**
 * Get all feature statuses for an organization based on their active plan.
 */
export declare const getOrgFeatures: (orgId: number) => Promise<FeatureStatus[]>;
export {};
