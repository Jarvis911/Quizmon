import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { SubscriptionStatus, BillingCycle, PaymentMethod, PaymentStatus } from '@prisma/client';
import { createCheckoutSession, fulfillSubscription, handlePaymentCallback, getAvailableGateways } from '../services/paymentService.js';
import { getUsage } from '../services/usageService.js';
import { getOrgFeatures } from '../services/featureGateService.js';

// ─── Checkout Flow ──────────────────────────────────────────────────

export const createCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { planId, billingCycle, paymentMethod } = req.body as { 
            planId: number; 
            billingCycle?: BillingCycle;
            paymentMethod?: PaymentMethod;
        };
        const organizationId = req.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const result = await createCheckoutSession(
            organizationId,
            planId,
            billingCycle,
            paymentMethod || PaymentMethod.MOMO
        );

        res.status(200).json({
            url: result.payUrl,
            orderId: result.orderId,
            requestId: result.requestId,
        });
    } catch (err) {
        console.error('[createCheckout Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

/**
 * POST /subscriptions/fulfill
 *
 * Status-check endpoint used by the post-payment redirect page.
 *
 * SECURITY: This endpoint must NOT be a fulfillment authority. The actual
 * subscription activation is performed by the gateway IPN handler
 * (e.g. `handleMomoIPN`), which verifies a signed server-to-server callback.
 *
 * Therefore this endpoint:
 *   - Accepts ONLY `orderId` / `sessionId` from the body. Any other field
 *     (`orgId`, `planId`, `billingCycle`, `paymentMethod`) is ignored — those
 *     are recovered from the persisted `Payment` record created at checkout.
 *   - Requires the caller to be a member of the organization that owns the
 *     payment (enforced via `req.organizationId` set by `orgMiddleware`).
 *   - Reports the current persisted state (COMPLETED / PAY_PENDING / PAY_FAILED).
 *     It never activates a plan on its own.
 */
export const fulfillCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { orderId, sessionId } = req.body as {
            orderId?: string;
            sessionId?: string;
        };

        const resolvedOrderId = orderId || sessionId;
        const organizationId = req.organizationId;

        if (!resolvedOrderId) {
            res.status(400).json({ message: 'orderId is required' });
            return;
        }
        if (!organizationId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const payment = await prisma.payment.findFirst({
            where: { externalId: resolvedOrderId },
        });

        if (!payment) {
            res.status(404).json({ message: 'Payment not found' });
            return;
        }

        // Ownership check: the authenticated user must belong to the org that
        // initiated this payment. `orgMiddleware` already verified membership
        // for `req.organizationId`, so a strict equality check is sufficient.
        if (payment.organizationId !== organizationId) {
            res.status(403).json({ message: 'You do not have access to this payment' });
            return;
        }

        if (payment.status === PaymentStatus.PAY_FAILED) {
            res.status(400).json({
                status: 'FAILED',
                message: 'Payment failed. Please try again.',
            });
            return;
        }

        if (payment.status === PaymentStatus.REFUNDED) {
            res.status(400).json({
                status: 'REFUNDED',
                message: 'Payment was refunded.',
            });
            return;
        }

        if (payment.status === PaymentStatus.PAY_PENDING) {
            // The IPN has not yet confirmed this transaction. We deliberately
            // do NOT activate the plan here — that would re-open the bypass
            // vulnerability. The frontend should retry / display a pending
            // state and rely on the IPN to flip status to COMPLETED.
            res.status(202).json({
                status: 'PENDING',
                message: 'Payment is being verified. Please wait a moment and refresh.',
            });
            return;
        }

        // payment.status === COMPLETED → IPN has already activated the sub.
        const subscription = await prisma.subscription.findFirst({
            where: { organizationId, status: SubscriptionStatus.ACTIVE },
            include: { plan: { include: { features: true } } },
            orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
            // Edge case: payment is COMPLETED but no active subscription. This
            // shouldn't normally happen (IPN creates the subscription in the
            // same transaction). Surface a clear error rather than silently
            // creating one from untrusted client data.
            res.status(409).json({
                status: 'COMPLETED_NO_SUBSCRIPTION',
                message: 'Payment completed but subscription record is missing. Please contact support.',
            });
            return;
        }

        res.status(200).json(subscription);
    } catch (err) {
        console.error('[fulfillCheckout Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

// ─── MoMo IPN Callback ─────────────────────────────────────────────

/**
 * POST /subscriptions/momo-ipn
 * Called by MoMo servers (server-to-server). No auth required.
 */
export const handleMomoIPN = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('[MoMo IPN] Received callback:', req.body);

        const result = await handlePaymentCallback(PaymentMethod.MOMO, req.body);

        if (result.success) {
            console.log('[MoMo IPN] Payment fulfilled successfully');
            // MoMo expects HTTP 204 for successful IPN processing
            res.status(204).send();
        } else {
            console.warn('[MoMo IPN] Payment not successful:', result.message);
            res.status(200).json({ message: result.message });
        }
    } catch (err) {
        console.error('[MoMo IPN Error]:', err);
        // Return 200 to prevent MoMo retries on processing errors
        res.status(200).json({ message: (err as Error).message });
    }
};

// ─── Payment Methods ────────────────────────────────────────────────

/**
 * GET /subscriptions/payment-methods
 * List available payment gateways.
 */
export const getPaymentMethods = async (_req: Request, res: Response): Promise<void> => {
    try {
        const gateways = getAvailableGateways();
        res.status(200).json(gateways);
    } catch (err) {
        console.error('[getPaymentMethods Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

// ─── Free Checkout (0đ promotions) ─────────────────────────────────

/**
 * POST /subscriptions/checkout-free
 * Purchases a plan directly when price is 0 (promotion). No payment gateway needed.
 */
export const checkoutFree = async (req: Request, res: Response): Promise<void> => {
    try {
        const { planId, promotionId, billingCycle } = req.body as {
            planId: number;
            promotionId: number;
            billingCycle?: BillingCycle;
        };
        const organizationId = req.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        if (!planId || !promotionId) {
            res.status(400).json({ message: 'planId and promotionId are required' });
            return;
        }

        // Verify promotion exists, is active & published, and not expired
        const promotion = await prisma.promotion.findFirst({
            where: {
                id: Number(promotionId),
                planId: Number(planId),
                isActive: true,
                isPublished: true,
                expiresAt: { gt: new Date() },
            },
        });

        if (!promotion) {
            res.status(400).json({ message: 'Promotion not found or has expired' });
            return;
        }

        const cycle = (billingCycle ?? BillingCycle.MONTHLY) as BillingCycle;
        const discountedPrice = cycle === BillingCycle.YEARLY
            ? promotion.discountedPriceYearly
            : promotion.discountedPriceMonthly;

        if (discountedPrice !== 0) {
            res.status(400).json({ message: 'This promotion is not free. Use the regular checkout.' });
            return;
        }

        // Fulfill subscription directly (no payment gateway)
        const orderId = `FREE_${organizationId}_${planId}_${promotionId}_${Date.now()}`;
        const subscription = await fulfillSubscription(
            orderId,
            organizationId,
            Number(planId),
            cycle,
            PaymentMethod.MOCK,
        );

        res.status(200).json(subscription);
    } catch (err) {
        console.error('[checkoutFree Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

// ─── Existing Handlers ──────────────────────────────────────────────

/**
 * GET /subscriptions/plans — List all active plans with their features.
 */
export const getPlans = async (_req: Request, res: Response): Promise<void> => {
    try {
        const plans = await prisma.plan.findMany({
            where: { isActive: true },
            include: { features: true },
            orderBy: { priceMonthly: 'asc' },
        });
        res.status(200).json(plans);
    } catch (err) {
        console.error('[getPlans Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

/**
 * GET /subscriptions/current — Get the org's active subscription.
 */
export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const subscription = await prisma.subscription.findFirst({
            where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
            include: {
                plan: { include: { features: true } },
                organization: { select: { id: true, name: true, slug: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (!subscription) {
            res.status(404).json({ message: 'No active subscription found' });
            return;
        }

        const features = await getOrgFeatures(orgId);
        const usage = await getUsage(orgId);
        res.status(200).json({ ...subscription, featureStatuses: features, usageMetrics: usage });
    } catch (err) {
        console.error('[getCurrentSubscription Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

/**
 * POST /subscriptions — Create or upgrade a subscription.
 */
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const { planId, billingCycle } = req.body as {
            planId: number;
            billingCycle?: BillingCycle;
        };

        const plan = await prisma.plan.findUnique({ where: { id: Number(planId) } });
        if (!plan || !plan.isActive) {
            res.status(404).json({ message: 'Plan not found or inactive' });
            return;
        }

        await prisma.subscription.updateMany({
            where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
            data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
        });

        const now = new Date();
        const cycle = billingCycle ?? BillingCycle.MONTHLY;
        const periodEnd = new Date(now);
        if (cycle === BillingCycle.YEARLY) {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        } else {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
        }

        const subscription = await prisma.subscription.create({
            data: {
                organizationId: orgId,
                planId: plan.id,
                billingCycle: cycle,
                status: SubscriptionStatus.ACTIVE,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            },
            include: {
                plan: { include: { features: true } },
            },
        });

        res.status(201).json(subscription);
    } catch (err) {
        console.error('[createSubscription Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

/**
 * POST /subscriptions/cancel — Cancel the active subscription.
 */
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const subscription = await prisma.subscription.findFirst({
            where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
        });

        if (!subscription) {
            res.status(404).json({ message: 'No active subscription to cancel' });
            return;
        }

        const canceled = await prisma.subscription.update({
            where: { id: subscription.id },
            data: {
                status: SubscriptionStatus.CANCELED,
                canceledAt: new Date(),
            },
            include: { plan: true },
        });

        res.status(200).json(canceled);
    } catch (err) {
        console.error('[cancelSubscription Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

/**
 * GET /subscriptions/usage — Get usage metrics for the current billing period.
 */
export const getUsageMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const usage = await getUsage(orgId);
        res.status(200).json(usage);
    } catch (err) {
        console.error('[getUsageMetrics Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};
