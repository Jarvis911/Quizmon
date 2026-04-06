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
 *     summary: Fulfill a checkout session
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orgId, planId]
 *             properties:
 *               orderId:
 *                 type: string
 *               sessionId:
 *                 type: string
 *               orgId:
 *                 type: integer
 *               planId:
 *                 type: integer
 *               paymentMethod:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription fulfilled
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
