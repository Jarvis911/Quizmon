import { Request, Response } from 'express';
export declare const createCheckout: (req: Request, res: Response) => Promise<void>;
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
 * POST /subscriptions/checkout-free
 * Purchases a plan directly when price is 0 (promotion). No payment gateway needed.
 */
export declare const checkoutFree: (req: Request, res: Response) => Promise<void>;
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
