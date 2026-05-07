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
export declare const fulfillSubscription: (orderId: string, orgId: number, planId: number, billingCycle?: BillingCycle, paymentMethod?: PaymentMethod, transactionId?: string) => Promise<any>;
/**
 * Process an IPN callback from a payment gateway.
 * Verifies the callback signature and fulfills the subscription if successful.
 */
export declare const handlePaymentCallback: (paymentMethod: PaymentMethod, callbackBody: any) => Promise<{
    success: boolean;
    message: string;
}>;
