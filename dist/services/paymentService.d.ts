import { BillingCycle } from '@prisma/client';
/**
 * Payment Service (Mock Integration)
 *
 * In a real app, this would use the Stripe SDK to create checkout sessions
 * and handle webhooks.
 */
interface CheckoutSession {
    id: string;
    url: string;
    status: 'open' | 'expired' | 'complete';
}
/**
 * Create a checkout session for a subscription plan.
 */
export declare const createCheckoutSession: (orgId: number, planId: number, billingCycle?: BillingCycle) => Promise<CheckoutSession>;
/**
 * Handle successful payment event (typically via webhook).
 * Cancels any existing active subscription, creates a Payment record,
 * and creates the new Subscription.
 */
export declare const fulfillSubscription: (sessionId: string, orgId: number, planId: number, billingCycle?: BillingCycle) => Promise<{
    plan: {
        features: {
            id: number;
            limit: number | null;
            planId: number;
            featureKey: import("@prisma/client").$Enums.FeatureKey;
            enabled: boolean;
        }[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        description: string | null;
        type: import("@prisma/client").$Enums.PlanType;
        priceMonthly: number;
        priceYearly: number;
        isActive: boolean;
    };
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    organizationId: number;
    status: import("@prisma/client").$Enums.SubscriptionStatus;
    billingCycle: import("@prisma/client").$Enums.BillingCycle;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    canceledAt: Date | null;
    trialEndsAt: Date | null;
    planId: number;
}>;
export {};
