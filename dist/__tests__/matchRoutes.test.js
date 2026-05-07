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
jest.unstable_mockModule('../middleware/orgMiddleware.js', () => ({
    __esModule: true,
    default: (req, res, next) => {
        req.organizationId = 1;
        next();
    },
}));
jest.unstable_mockModule('../middleware/logMiddleware.js', () => ({
    __esModule: true,
    default: (req, res, next) => {
        next();
    },
}));
jest.unstable_mockModule('../services/featureGateService.js', () => ({
    __esModule: true,
    canUseFeature: jest.fn().mockResolvedValue({ allowed: true, limit: null }),
    getOrgFeatures: jest.fn().mockResolvedValue([]),
}));
jest.unstable_mockModule('../services/usageService.js', () => ({
    __esModule: true,
    trackUsage: jest.fn(),
    checkLimit: jest.fn().mockResolvedValue({ allowed: true, limit: 10, current: 0 }),
    getUsage: jest.fn().mockResolvedValue([]),
}));
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
describe('Match Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /match', () => {
        it('should create a new match', async () => {
            const mockMatch = { id: 1, quizId: 1, hostId: 1, timePerQuestion: 30 };
            prismaMock.match.create.mockResolvedValue(mockMatch);
            const response = await request(app)
                .post('/match')
                .send({ quizId: 1, timePerQuestion: 30 });
            expect(response.status).toBe(201);
            expect(response.body.quizId).toBe(1);
        });
    });
    describe('GET /match/:id', () => {
        it('should get a match by ID', async () => {
            const mockMatch = { id: 1, quizId: 1, hostId: 1 };
            prismaMock.match.findUnique.mockResolvedValue(mockMatch);
            const response = await request(app).get('/match/1');
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(1);
        });
    });
    describe('PUT /match/:id', () => {
        it('should update a match', async () => {
            const mockMatch = { id: 1, quizId: 1, timePerQuestion: 45 };
            prismaMock.match.update.mockResolvedValue(mockMatch);
            const response = await request(app)
                .put('/match/1')
                .send({ timePerQuestion: 45 });
            expect(response.status).toBe(200);
            expect(response.body.timePerQuestion).toBe(45);
        });
    });
    describe('DELETE /match/:id', () => {
        it('should delete a match if authorized', async () => {
            const mockMatch = { id: 1, hostId: 1 }; // Host matches user ID
            prismaMock.match.findUnique.mockResolvedValue(mockMatch);
            prismaMock.match.delete.mockResolvedValue(mockMatch);
            const response = await request(app).delete('/match/1');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Match deleted successfully');
        });
        it('should return 403 if not authorized', async () => {
            const mockMatch = { id: 1, hostId: 2 }; // Host DOES NOT match user ID
            prismaMock.match.findUnique.mockResolvedValue(mockMatch);
            const response = await request(app).delete('/match/1');
            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Not authorized to delete this match');
        });
    });
});
