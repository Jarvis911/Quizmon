import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import orgMiddleware from '../middleware/orgMiddleware.js';
import {
    getPlans,
    getCurrentSubscription,
    createSubscription,
    cancelSubscription,
    getUsageMetrics,
    createCheckout,
    fulfillCheckout,
    handleMomoIPN,
    getPaymentMethods,
    checkoutFree,
} from '../controllers/subscriptionController.js';

const router: Router = Router();

/**
 * @swagger
 * /subscriptions/plans:
 *   get:
 *     summary: List all available plans
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of plans
 */
router.get('/plans', getPlans);

/**
 * @swagger
 * /subscriptions/payment-methods:
 *   get:
 *     summary: List available payment gateways
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of payment methods with availability status
 */
router.get('/payment-methods', getPaymentMethods);

/**
 * @swagger
 * /subscriptions/current:
 *   get:
 *     summary: Get current active subscription for the organization
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         schema:
 *           type: integer
 *         description: Organization ID (optional, defaults to user's primary org)
 *     responses:
 *       200:
 *         description: Active subscription details
 */
router.get('/current', authMiddleware, orgMiddleware, getCurrentSubscription);

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create or upgrade a subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId]
 *             properties:
 *               planId:
 *                 type: integer
 *               billingCycle:
 *                 type: string
 *                 enum: [MONTHLY, YEARLY]
 *     responses:
 *       201:
 *         description: Subscription created
 */
router.post('/', authMiddleware, orgMiddleware, createSubscription);

/**
 * @swagger
 * /subscriptions/checkout:
 *   post:
 *     summary: Initiate a checkout session via payment gateway
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [planId]
 *             properties:
 *               planId:
 *                 type: integer
 *               billingCycle:
 *                 type: string
 *                 enum: [MONTHLY, YEARLY]
 *               paymentMethod:
 *                 type: string
 *                 enum: [MOMO, VNPAY, STRIPE]
 *     responses:
 *       200:
 *         description: Checkout session created with payUrl
 */
router.post('/checkout', authMiddleware, orgMiddleware, createCheckout);

/**
 * POST /subscriptions/checkout-free
 * Purchase a 0-price plan directly without payment gateway.
 */
router.post('/checkout-free', authMiddleware, orgMiddleware, checkoutFree);

/**
 * @swagger
 * /subscriptions/fulfill:
 *   post:
 *     summary: Check the status of a checkout session (post-redirect)
 *     description: |
 *       Status-only endpoint. The actual subscription activation is performed
 *       server-to-server by the gateway IPN handler (e.g. /subscriptions/momo-ipn)
 *       which verifies the gateway signature. This endpoint reads the persisted
 *       Payment record (looked up by orderId) and reports its current state.
 *       It never trusts orgId / planId / billingCycle / paymentMethod from the
 *       caller — those are derived from the stored Payment / Subscription rows.
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId]
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: The order ID returned by /subscriptions/checkout.
 *               sessionId:
 *                 type: string
 *                 description: Alias for orderId (legacy field).
 *     responses:
 *       200:
 *         description: Payment is COMPLETED and the active subscription is returned.
 *       202:
 *         description: Payment is still PENDING — IPN has not arrived yet. Retry shortly.
 *       400:
 *         description: Payment failed or refunded.
 *       403:
 *         description: Authenticated user is not a member of the org that owns this payment.
 *       404:
 *         description: No Payment record found for the supplied orderId.
 */
router.post('/fulfill', authMiddleware, orgMiddleware, fulfillCheckout);

/**
 * @swagger
 * /subscriptions/momo-ipn:
 *   post:
 *     summary: MoMo IPN callback (server-to-server, no auth)
 *     tags: [Subscription]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       204:
 *         description: IPN processed successfully
 */
router.post('/momo-ipn', handleMomoIPN);

/**
 * @swagger
 * /subscriptions/cancel:
 *   post:
 *     summary: Cancel active subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Subscription canceled
 */
router.post('/cancel', authMiddleware, orgMiddleware, cancelSubscription);

/**
 * @swagger
 * /subscriptions/usage:
 *   get:
 *     summary: Get usage metrics for current billing period
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: header
 *         name: x-organization-id
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usage metrics
 */
router.get('/usage', authMiddleware, orgMiddleware, getUsageMetrics);

export default router;
