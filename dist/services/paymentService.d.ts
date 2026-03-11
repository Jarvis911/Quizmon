import { BillingCycle, PaymentMethod } from '@prisma/client';
import { getAvailableGateways } from './gateways/paymentGateway.js';
export { getAvailableGateways };
interface CheckoutResult {
    /** URL to redirect the user to for payment */
    payUrl: string;
    /** Our internal order ID */
    orderId: string;
    /** Gateway request ID */
    requestId: string;
    /** Raw response for debugging */
    rawResponse?: any;
}
/**
 * Create a checkout session via the selected payment gateway.
 * Returns a payUrl that the frontend should redirect the user to.
 */
export declare const createCheckoutSession: (orgId: number, planId: number, billingCycle?: BillingCycle, paymentMethod?: PaymentMethod) => Promise<CheckoutResult>;
/**
 * Fulfill a subscription after successful payment.
 * Called either by IPN callback or by frontend redirect.
 */
export declare const fulfillSubscription: (orderId: string, orgId: number, planId: number, billingCycle?: BillingCycle, paymentMethod?: PaymentMethod, transactionId?: string) => Promise<{
    plan: {
        features: {
            id: number;
            planId: number;
            featureKey: import("@prisma/client").$Enums.FeatureKey;
            limit: number | null;
            enabled: boolean;
        }[];
    } & {
        name: string;
        id: number;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.PlanType;
        description: string | null;
        priceMonthly: number;
        priceYearly: number;
        isActive: boolean;
    };
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    status: import("@prisma/client").$Enums.SubscriptionStatus;
    billingCycle: import("@prisma/client").$Enums.BillingCycle;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    canceledAt: Date | null;
    trialEndsAt: Date | null;
    organizationId: number;
    planId: number;
}>;
/**
 * Process an IPN callback from a payment gateway.
 * Verifies the callback signature and fulfills the subscription if successful.
 */
export declare const handlePaymentCallback: (paymentMethod: PaymentMethod, callbackBody: any) => Promise<{
    success: boolean;
    message: string;
}>;
