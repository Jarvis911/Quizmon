import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

jest.unstable_mockModule('../prismaClient.js', () => ({
    __esModule: true,
    default: prismaMock,
}));

const passthroughAuth = (req: Request, _res: Response, next: NextFunction) => {
    req.user = { id: 1 };
    req.userId = 1;
    next();
};

jest.unstable_mockModule('../middleware/authMiddleware.js', () => ({
    __esModule: true,
    default: passthroughAuth,
    optionalAuthMiddleware: passthroughAuth,
}));

jest.unstable_mockModule('../services/azureBlobService.js', () => ({
    __esModule: true,
    uploadBufferToAzure: (jest.fn() as any).mockResolvedValue('http://example.com/image.jpg'),
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('Subscription Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /subscriptions/plans', () => {
        it('should list all active plans', async () => {
            const mockPlans = [
                {
                    id: 1,
                    type: 'FREE',
                    name: 'Free',
                    description: 'Basic features',
                    priceMonthly: 0,
                    priceYearly: 0,
                    isActive: true,
                    features: [
                        { id: 1, featureKey: 'AI_GENERATION', enabled: true, limit: 5 },
                    ],
                },
                {
                    id: 2,
                    type: 'TEACHER_PRO',
                    name: 'Teacher Pro',
                    description: 'Pro features',
                    priceMonthly: 9.99,
                    priceYearly: 99.99,
                    isActive: true,
                    features: [],
                },
            ];

            prismaMock.plan.findMany.mockResolvedValue(mockPlans as any);

            const response = await request(app).get('/subscriptions/plans');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body).toHaveLength(2);
            expect(response.body[0].name).toBe('Free');
        });
    });

    describe('GET /subscriptions/current', () => {
        it('should return active subscription with org context', async () => {
            // Mock org middleware — user has default org
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1,
                organizationId: 1,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);

            const mockSubscription = {
                id: 1,
                status: 'ACTIVE',
                billingCycle: 'MONTHLY',
                currentPeriodStart: new Date(),
                currentPeriodEnd: new Date(),
                organizationId: 1,
                planId: 1,
                plan: {
                    id: 1,
                    type: 'FREE',
                    name: 'Free',
                    features: [],
                },
                organization: { id: 1, name: 'Test Org', slug: 'test-org' },
            };

            prismaMock.subscription.findFirst.mockResolvedValue(mockSubscription as any);
            prismaMock.usageMetric.findMany.mockResolvedValue([]);

            const response = await request(app).get('/subscriptions/current');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('ACTIVE');
            expect(response.body.usageMetrics).toBeDefined();
        });

        it('should return 404 when no active subscription', async () => {
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1,
                organizationId: 1,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);

            prismaMock.subscription.findFirst.mockResolvedValue(null);

            const response = await request(app).get('/subscriptions/current');

            expect(response.status).toBe(404);
        });
    });

    describe('POST /subscriptions', () => {
        it('should create a new subscription', async () => {
            // Mock org middleware
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1,
                organizationId: 1,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);

            // Mock plan lookup
            prismaMock.plan.findUnique.mockResolvedValue({
                id: 2,
                type: 'TEACHER_PRO',
                name: 'Teacher Pro',
                isActive: true,
                priceMonthly: 9.99,
                priceYearly: 99.99,
            } as any);

            // Mock cancel existing
            prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 } as any);

            // Mock create subscription
            const mockSub = {
                id: 2,
                status: 'ACTIVE',
                billingCycle: 'MONTHLY',
                organizationId: 1,
                planId: 2,
                plan: {
                    id: 2,
                    name: 'Teacher Pro',
                    features: [],
                },
            };
            prismaMock.subscription.create.mockResolvedValue(mockSub as any);

            const response = await request(app)
                .post('/subscriptions')
                .send({ planId: 2, billingCycle: 'MONTHLY' });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe('ACTIVE');
        });

        it('should return 404 for invalid plan', async () => {
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1,
                organizationId: 1,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);

            prismaMock.plan.findUnique.mockResolvedValue(null);

            const response = await request(app)
                .post('/subscriptions')
                .send({ planId: 999 });

            expect(response.status).toBe(404);
        });
    });

    describe('POST /subscriptions/cancel', () => {
        it('should cancel the active subscription', async () => {
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1,
                organizationId: 1,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);

            prismaMock.subscription.findFirst.mockResolvedValue({
                id: 1,
                status: 'ACTIVE',
                organizationId: 1,
            } as any);

            prismaMock.subscription.update.mockResolvedValue({
                id: 1,
                status: 'CANCELED',
                canceledAt: new Date(),
                plan: { name: 'Free' },
            } as any);

            const response = await request(app).post('/subscriptions/cancel');

            expect(response.status).toBe(200);
            expect(response.body.status).toBe('CANCELED');
        });
    });

    describe('POST /subscriptions/fulfill (security)', () => {
        const ORDER_ID = 'QUIZMON_1_2_1700000000000';

        const mockMembership = (orgId: number) => {
            // orgMiddleware path: header → findUnique, no header → findFirst
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1,
                organizationId: orgId,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);
            prismaMock.organizationMember.findUnique.mockResolvedValue({
                id: 1,
                organizationId: orgId,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);
        };

        it('should reject when orderId is missing', async () => {
            mockMembership(1);

            const response = await request(app)
                .post('/subscriptions/fulfill')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.message).toMatch(/orderId/i);
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        });

        it('should return 404 when no Payment record exists for orderId', async () => {
            mockMembership(1);
            prismaMock.payment.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .post('/subscriptions/fulfill')
                .send({ orderId: 'NON_EXISTENT' });

            expect(response.status).toBe(404);
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        });

        it('REGRESSION: must reject cross-tenant attempt — auth user belongs to org 1 but tries to fulfill payment owned by org 99', async () => {
            // Authenticated user is a member of org 1 only.
            mockMembership(1);

            // The Payment they reference belongs to a different org (99).
            prismaMock.payment.findFirst.mockResolvedValue({
                id: 42,
                organizationId: 99,
                externalId: ORDER_ID,
                status: 'COMPLETED',
                paymentMethod: 'MOMO',
                amount: 99000,
                currency: 'VND',
                description: 'Pro yearly',
                createdAt: new Date(),
            } as any);

            const response = await request(app)
                .post('/subscriptions/fulfill')
                .send({
                    orderId: ORDER_ID,
                    // Attacker-supplied fields that the OLD vulnerable
                    // implementation would have trusted blindly.
                    orgId: 99,
                    planId: 2,
                    billingCycle: 'YEARLY',
                    paymentMethod: 'MOCK',
                });

            expect(response.status).toBe(403);
            // No subscription should ever be created for the attacker.
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
            expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
        });

        it('REGRESSION: must NOT activate a plan when payment is still PAY_PENDING', async () => {
            mockMembership(1);
            prismaMock.payment.findFirst.mockResolvedValue({
                id: 7,
                organizationId: 1,
                externalId: ORDER_ID,
                status: 'PAY_PENDING',
                paymentMethod: 'MOMO',
                amount: 99000,
                currency: 'VND',
                description: 'Pending',
                createdAt: new Date(),
            } as any);

            const response = await request(app)
                .post('/subscriptions/fulfill')
                .send({
                    orderId: ORDER_ID,
                    // Attacker tries to coerce the server into activating the
                    // top-tier plan even though no payment has cleared.
                    orgId: 1,
                    planId: 999,
                    billingCycle: 'YEARLY',
                    paymentMethod: 'MOCK',
                });

            expect(response.status).toBe(202);
            expect(response.body.status).toBe('PENDING');
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
            expect(prismaMock.subscription.updateMany).not.toHaveBeenCalled();
        });

        it('should return 400 when payment failed', async () => {
            mockMembership(1);
            prismaMock.payment.findFirst.mockResolvedValue({
                id: 8,
                organizationId: 1,
                externalId: ORDER_ID,
                status: 'PAY_FAILED',
                paymentMethod: 'MOMO',
                amount: 99000,
                currency: 'VND',
                description: 'Failed',
                createdAt: new Date(),
            } as any);

            const response = await request(app)
                .post('/subscriptions/fulfill')
                .send({ orderId: ORDER_ID });

            expect(response.status).toBe(400);
            expect(response.body.status).toBe('FAILED');
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        });

        it('should return the active subscription when payment is COMPLETED', async () => {
            mockMembership(1);
            prismaMock.payment.findFirst.mockResolvedValue({
                id: 9,
                organizationId: 1,
                externalId: ORDER_ID,
                status: 'COMPLETED',
                paymentMethod: 'MOMO',
                amount: 99000,
                currency: 'VND',
                description: 'Pro',
                createdAt: new Date(),
            } as any);

            const activeSub = {
                id: 100,
                status: 'ACTIVE',
                billingCycle: 'YEARLY',
                organizationId: 1,
                planId: 2,
                plan: { id: 2, name: 'Teacher Pro', features: [] },
            };
            prismaMock.subscription.findFirst.mockResolvedValue(activeSub as any);

            const response = await request(app)
                .post('/subscriptions/fulfill')
                .send({ orderId: ORDER_ID });

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(100);
            expect(response.body.status).toBe('ACTIVE');
        });
    });

    describe('GET /subscriptions/usage', () => {
        it('should return usage metrics', async () => {
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1,
                organizationId: 1,
                userId: 1,
                role: 'OWNER',
                joinedAt: new Date(),
            } as any);

            // Mock subscription for period lookup
            prismaMock.subscription.findFirst.mockResolvedValue({
                id: 1,
                currentPeriodStart: new Date('2026-03-01'),
                currentPeriodEnd: new Date('2026-04-01'),
                status: 'ACTIVE',
            } as any);

            const mockMetrics = [
                { key: 'matches_hosted', value: 5 },
                { key: 'quizzes_created', value: 12 },
            ];
            prismaMock.usageMetric.findMany.mockResolvedValue(mockMetrics as any);

            const response = await request(app).get('/subscriptions/usage');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});
