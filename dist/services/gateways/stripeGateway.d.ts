import { PaymentGateway } from './paymentGateway.js';
/**
 * Stripe Payment Gateway — Placeholder
 *
 * To implement:
 * 1. Install stripe SDK: npm install stripe
 * 2. Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET to .env
 * 3. Implement createPayment() using Stripe Checkout Sessions
 * 4. Implement verifyCallback() for Stripe Webhooks
 */
export declare const stripeGateway: PaymentGateway;
