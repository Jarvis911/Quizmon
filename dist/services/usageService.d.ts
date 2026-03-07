/**
 * Track (increment) a usage metric for an organization in the current billing period.
 * Uses upsert to create or increment the counter atomically.
 */
export declare const trackUsage: (orgId: number, key: string, increment?: number) => Promise<{
    id: number;
    createdAt: Date;
    updatedAt: Date;
    organizationId: number;
    key: string;
    value: number;
    periodStart: Date;
    periodEnd: Date;
}>;
/**
 * Get current period usage for an organization.
 * If key is provided, returns a single metric; otherwise returns all metrics.
 */
export declare const getUsage: (orgId: number, key?: string) => Promise<{
    id: number;
    createdAt: Date;
    updatedAt: Date;
    organizationId: number;
    key: string;
    value: number;
    periodStart: Date;
    periodEnd: Date;
} | {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    organizationId: number;
    key: string;
    value: number;
    periodStart: Date;
    periodEnd: Date;
}[] | {
    key: string;
    value: number;
    periodStart: Date;
}>;
/**
 * Check if an organization has exceeded the limit for a given usage key.
 * Returns { allowed, limit, current }.
 */
export declare const checkLimit: (orgId: number, usageKey: string, featureKey: string) => Promise<{
    allowed: boolean;
    limit: number | null;
    current: number;
}>;
