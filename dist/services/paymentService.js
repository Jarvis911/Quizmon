import prisma from '../prismaClient.js';
import { BillingCycle, SubscriptionStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { getGateway, getAvailableGateways } from './gateways/paymentGateway.js';
import { FRONTEND_URL, BACKEND_URL } from '../config/index.js';
// Re-export for convenience
export { getAvailableGateways };
// ─── Create Checkout Session ────────────────────────────────────────
/**
 * Create a checkout session via the selected payment gateway.
 * Returns a payUrl that the frontend should redirect the user to.
 */
export const createCheckoutSession = async (orgId, planId, billingCycle = BillingCycle.MONTHLY, paymentMethod = PaymentMethod.MOMO) => {
    const org = await prisma.organization.findUnique({
        where: { id: orgId },
        include: { members: { where: { role: 'OWNER' }, take: 1 } }
    });
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!org || !plan)
        throw new Error('Organization or Plan not found');
    // Generate a unique order ID
    const orderId = `QUIZMON_${orgId}_${planId}_${Date.now()}`;
    const amount = billingCycle === BillingCycle.YEARLY ? plan.priceYearly : plan.priceMonthly;
    // For MoMo: amount must be in VND (integer)
    const amountInSmallestUnit = paymentMethod === PaymentMethod.MOMO
        ? Math.round(amount) // VND is already whole numbers
        : Math.round(amount * 100); // USD → cents for Stripe
    const redirectUrl = `${FRONTEND_URL}/billing/success?orderId=${orderId}&plan_id=${planId}&billing_cycle=${billingCycle}&payment_method=${paymentMethod}`;
    const ipnUrl = `${BACKEND_URL}/subscriptions/momo-ipn`;
    // Get the gateway and create the payment
    const gateway = getGateway(paymentMethod);
    const result = await gateway.createPayment({
        orderId,
        amount: amountInSmallestUnit,
        orderInfo: `Quizmon ${plan.name} subscription (${billingCycle})`,
        redirectUrl,
        ipnUrl,
        extraData: Buffer.from(JSON.stringify({
            orgId,
            planId,
            billingCycle,
        })).toString('base64'),
    });
    // Create a PENDING payment record
    await prisma.payment.create({
        data: {
            organizationId: orgId,
            amount: amountInSmallestUnit,
            currency: paymentMethod === PaymentMethod.MOMO ? 'VND' : 'USD',
            status: PaymentStatus.PAY_PENDING,
            paymentMethod,
            externalId: orderId,
            description: `${plan.name} (${billingCycle}) — Pending`,
        },
    });
    return {
        payUrl: result.payUrl,
        orderId: result.gatewayOrderId,
        requestId: result.requestId,
        rawResponse: result.rawResponse,
    };
};
// ─── Fulfill Subscription ───────────────────────────────────────────
/**
 * Fulfill a subscription after successful payment.
 * Called either by IPN callback or by frontend redirect.
 */
export const fulfillSubscription = async (orderId, orgId, planId, billingCycle = BillingCycle.MONTHLY, paymentMethod = PaymentMethod.MOCK, transactionId) => {
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
    return prisma.$transaction(async (tx) => {
        // Cancel any existing active subscriptions
        await tx.subscription.updateMany({
            where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
            data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
        });
        // Update or create Payment record
        const existingPayment = await tx.payment.findFirst({
            where: { externalId: orderId, organizationId: orgId },
        });
        if (existingPayment) {
            await tx.payment.update({
                where: { id: existingPayment.id },
                data: {
                    status: PaymentStatus.COMPLETED,
                    description: `Subscription to ${plan.name} (${billingCycle})`,
                },
            });
        }
        else {
            await tx.payment.create({
                data: {
                    organizationId: orgId,
                    amount,
                    currency: paymentMethod === PaymentMethod.MOMO ? 'VND' : 'USD',
                    status: PaymentStatus.COMPLETED,
                    paymentMethod,
                    externalId: transactionId || orderId,
                    description: `Subscription to ${plan.name} (${billingCycle})`,
                },
            });
        }
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
// ─── Handle Payment Callback ────────────────────────────────────────
/**
 * Process an IPN callback from a payment gateway.
 * Verifies the callback signature and fulfills the subscription if successful.
 */
export const handlePaymentCallback = async (paymentMethod, callbackBody) => {
    const gateway = getGateway(paymentMethod);
    const result = await gateway.verifyCallback(callbackBody);
    if (!result.success) {
        // Update payment as failed
        await prisma.payment.updateMany({
            where: { externalId: result.orderId },
            data: { status: PaymentStatus.PAY_FAILED },
        });
        return { success: false, message: result.message };
    }
    // Parse extraData from callback to get orgId, planId, billingCycle
    let orgId, planId, billingCycle;
    try {
        const extraData = callbackBody.extraData
            ? JSON.parse(Buffer.from(callbackBody.extraData, 'base64').toString())
            : {};
        orgId = extraData.orgId;
        planId = extraData.planId;
        billingCycle = extraData.billingCycle || BillingCycle.MONTHLY;
    }
    catch {
        // If extraData parsing fails, try to extract from orderId
        const parts = result.orderId.split('_');
        orgId = Number(parts[1]);
        planId = Number(parts[2]);
        billingCycle = BillingCycle.MONTHLY;
    }
    if (!orgId || !planId) {
        throw new Error('Cannot determine orgId/planId from callback');
    }
    await fulfillSubscription(result.orderId, orgId, planId, billingCycle, paymentMethod, result.transactionId);
    return { success: true, message: 'Subscription activated' };
};
