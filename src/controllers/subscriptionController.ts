import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { SubscriptionStatus, BillingCycle } from '@prisma/client';
import { createCheckoutSession, fulfillSubscription } from '../services/paymentService.js';
import { getUsage } from '../services/usageService.js';
import { getOrgFeatures } from '../services/featureGateService.js';

export const createCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { planId, billingCycle } = req.body as { 
            planId: number; 
            billingCycle?: BillingCycle 
        };
        const organizationId = req.organizationId;

        if (!organizationId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const session = await createCheckoutSession(organizationId, planId, billingCycle);
        res.status(200).json(session);
    } catch (err) {
        console.error('[createCheckout Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

export const fulfillCheckout = async (req: Request, res: Response): Promise<void> => {
    try {
        const { sessionId, orgId, planId, billingCycle } = req.body as { 
            sessionId: string; 
            orgId: number; 
            planId: number;
            billingCycle?: BillingCycle;
        };

        if (!sessionId || !orgId || !planId) {
            res.status(400).json({ message: 'Missing fulfillment data' });
            return;
        }

        const subscription = await fulfillSubscription(sessionId, orgId, planId, billingCycle);
        res.status(200).json(subscription);
    } catch (err) {
        console.error('[fulfillCheckout Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

// ——— Handlers ———

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

        // Attach feature statuses
        const features = await getOrgFeatures(orgId);

        res.status(200).json({ ...subscription, featureStatuses: features });
    } catch (err) {
        console.error('[getCurrentSubscription Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

/**
 * POST /subscriptions — Create or upgrade a subscription.
 * Body: { planId, billingCycle? }
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

        // Verify plan exists
        const plan = await prisma.plan.findUnique({ where: { id: Number(planId) } });
        if (!plan || !plan.isActive) {
            res.status(404).json({ message: 'Plan not found or inactive' });
            return;
        }

        // Cancel any existing active subscription
        await prisma.subscription.updateMany({
            where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
            data: { status: SubscriptionStatus.CANCELED, canceledAt: new Date() },
        });

        // Compute billing period
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
