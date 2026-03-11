/**
 * Stripe Payment Gateway — Placeholder
 *
 * To implement:
 * 1. Install stripe SDK: npm install stripe
 * 2. Add STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET to .env
 * 3. Implement createPayment() using Stripe Checkout Sessions
 * 4. Implement verifyCallback() for Stripe Webhooks
 */
export const stripeGateway = {
    name: 'Stripe',
    async createPayment(_params) {
        throw new Error('Stripe payment gateway is not yet implemented. Coming soon!');
    },
    async verifyCallback(_body) {
        throw new Error('Stripe callback verification is not yet implemented.');
    },
};
