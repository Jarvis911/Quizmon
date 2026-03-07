import prisma from '../prismaClient.js';
import { SubscriptionStatus, BillingCycle, PaymentStatus } from '@prisma/client';
/**
 * Create a checkout session for a subscription plan.
 */
export const createCheckoutSession = async (orgId, planId, billingCycle = BillingCycle.MONTHLY) => {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { members: { where: { role: 'OWNER' }, take: 1 } }
    });
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!org || !plan)
        throw new Error('Organization or Plan not found');
    // MOCK: Generate a fake Stripe checkout ID and URL
    const sessionId = `cs_test_${Math.random().toString(36).substring(2, 12)}`;
    // Embed planId and billingCycle in success URL so BillingSuccess can pass them to fulfill
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${baseUrl}/billing/success?session_id=${sessionId}&plan_id=${planId}&billing_cycle=${billingCycle}`;
    const cancelUrl = `${baseUrl}/billing/cancel`;
    return {
        id: sessionId,
        url: successUrl,
        status: 'open'
    };
};
/**
 * Handle successful payment event (typically via webhook).
 * Cancels any existing active subscription, creates a Payment record,
 * and creates the new Subscription.
 */
export const fulfillSubscription = async (sessionId, orgId, planId, billingCycle = BillingCycle.MONTHLY) => {
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan)
        throw new Error('Plan not found');
    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === BillingCycle.YEARLY) {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }
    else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    }
    const amount = billingCycle === BillingCycle.YEARLY ? plan.priceYearly : plan.priceMonthly;
    // Use a transaction to ensure atomicity
    return prisma.$transaction(async (tx) => {
        // Cancel any existing active subscriptions
        await tx.subscription.updateMany({
            where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
            data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
        });
        // Create Payment record
        await tx.payment.create({
            data: {
                organizationId: orgId,
                amount,
                currency: 'USD',
                status: PaymentStatus.COMPLETED,
                externalId: sessionId,
                description: `Subscription to ${plan.name} (${billingCycle})`,
            },
        });
        // Create new Subscription
        return tx.subscription.create({
            data: {
                organizationId: orgId,
                planId,
                status: SubscriptionStatus.ACTIVE,
                billingCycle,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
            include: {
                plan: { include: { features: true } },
            },
        });
    });
};
