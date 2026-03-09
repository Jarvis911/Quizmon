import { PaymentGateway, CreatePaymentParams, GatewayPaymentResult, GatewayCallbackResult } from './paymentGateway.js';

/**
 * Stripe Payment Gateway — Placeholder
 * 
 * To implement:
 * 1. Install stripe SDK: npm install stripe
 * 2. Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET to .env
 * 3. Implement createPayment() using Stripe Checkout Sessions
 * 4. Implement verifyCallback() for Stripe Webhooks
 */
export const stripeGateway: PaymentGateway = {
    name: 'Stripe',

    async createPayment(_params: CreatePaymentParams): Promise<GatewayPaymentResult> {
        throw new Error('Stripe payment gateway is not yet implemented. Coming soon!');
    },

    async verifyCallback(_body: any): Promise<GatewayCallbackResult> {
        throw new Error('Stripe callback verification is not yet implemented.');
    },
};
