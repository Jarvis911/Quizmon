import { Request, Response } from 'express';
export declare const createCheckout: (req: Request, res: Response) => Promise<void>;
export declare const fulfillCheckout: (req: Request, res: Response) => Promise<void>;
/**
 * POST /subscriptions/momo-ipn
 * Called by MoMo servers (server-to-server). No auth required.
 */
export declare const handleMomoIPN: (req: Request, res: Response) => Promise<void>;
/**
 * GET /subscriptions/payment-methods
 * List available payment gateways.
 */
export declare const getPaymentMethods: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /subscriptions/plans — List all active plans with their features.
 */
export declare const getPlans: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /subscriptions/current — Get the org's active subscription.
 */
export declare const getCurrentSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * POST /subscriptions — Create or upgrade a subscription.
 */
export declare const createSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * POST /subscriptions/cancel — Cancel the active subscription.
 */
export declare const cancelSubscription: (req: Request, res: Response) => Promise<void>;
/**
 * GET /subscriptions/usage — Get usage metrics for the current billing period.
 */
export declare const getUsageMetrics: (req: Request, res: Response) => Promise<void>;
