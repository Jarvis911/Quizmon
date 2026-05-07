import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';
const prismaMock = mockDeep();
jest.unstable_mockModule('../prismaClient.js', () => ({
    __esModule: true,
    default: prismaMock,
}));
jest.unstable_mockModule('../middleware/authMiddleware.js', () => ({
    __esModule: true,
    default: (req, res, next) => {
        req.user = { id: 1 };
        req.userId = 1;
        next();
    },
}));
jest.unstable_mockModule('../services/azureBlobService.js', () => ({
    __esModule: true,
    uploadBufferToAzure: jest.fn().mockResolvedValue('http://example.com/image.jpg'),
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
            prismaMock.plan.findMany.mockResolvedValue(mockPlans);
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
            });
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
            prismaMock.subscription.findFirst.mockResolvedValue(mockSubscription);
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
            });
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
            });
            // Mock plan lookup
            prismaMock.plan.findUnique.mockResolvedValue({
                id: 2,
                type: 'TEACHER_PRO',
                name: 'Teacher Pro',
                isActive: true,
                priceMonthly: 9.99,
                priceYearly: 99.99,
            });
            // Mock cancel existing
            prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 });
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
            prismaMock.subscription.create.mockResolvedValue(mockSub);
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
            });
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
            });
            prismaMock.subscription.findFirst.mockResolvedValue({
                id: 1,
                status: 'ACTIVE',
                organizationId: 1,
            });
            prismaMock.subscription.update.mockResolvedValue({
                id: 1,
                status: 'CANCELED',
                canceledAt: new Date(),
                plan: { name: 'Free' },
            });
            const response = await request(app).post('/subscriptions/cancel');
            expect(response.status).toBe(200);
            expect(response.body.status).toBe('CANCELED');
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
            });
            // Mock subscription for period lookup
            prismaMock.subscription.findFirst.mockResolvedValue({
                id: 1,
                currentPeriodStart: new Date('2026-03-01'),
                currentPeriodEnd: new Date('2026-04-01'),
                status: 'ACTIVE',
            });
            const mockMetrics = [
                { key: 'matches_hosted', value: 5 },
                { key: 'quizzes_created', value: 12 },
            ];
            prismaMock.usageMetric.findMany.mockResolvedValue(mockMetrics);
            const response = await request(app).get('/subscriptions/usage');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });
});
