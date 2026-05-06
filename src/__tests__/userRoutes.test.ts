import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

jest.unstable_mockModule('../prismaClient.js', () => ({
    __esModule: true,
    default: prismaMock,
}));

jest.unstable_mockModule('../middleware/authMiddleware.js', () => ({
    __esModule: true,
    default: (req: Request, res: Response, next: NextFunction) => {
        req.user = { id: 1 };
        req.userId = 1;
        next();
    },
}));

jest.unstable_mockModule('../middleware/logMiddleware.js', () => ({
    __esModule: true,
    default: (req: Request, res: Response, next: NextFunction) => {
        next();
    },
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('User Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /user/statistics', () => {
        it('should get user statistics successfully', async () => {
            const mockResults = [
                {
                    matchId: 1, userId: 1, score: 100, createdAt: new Date(),
                    match: { quizId: 1, quiz: { title: 'Test Quiz' } }
                }
            ];

            const mockAllResults = [
                { matchId: 1, userId: 1, score: 100 },
                { matchId: 1, userId: 2, score: 80 }
            ];

            prismaMock.matchResult.count.mockResolvedValueOnce(1 as any);
            prismaMock.matchResult.findMany
                .mockResolvedValueOnce(mockResults as any) // paged results
                .mockResolvedValueOnce(mockAllResults as any); // all results in those matches (for rank)

            const response = await request(app).get('/user/statistics');

            expect(response.status).toBe(200);
            expect(response.body.totalMatches).toBe(1);
            expect(response.body.winRate).toBe(1); // Rank 1 out of 1 match
            expect(response.body.rankCounts[1]).toBe(1);
            expect(response.body.pagination.total).toBe(1);
        });

        it('should return empty statistics if no results', async () => {
            prismaMock.matchResult.count.mockResolvedValueOnce(0 as any);
            prismaMock.matchResult.findMany.mockResolvedValueOnce([] as any);

            const response = await request(app).get('/user/statistics');

            expect(response.status).toBe(200);
            expect(response.body.totalMatches).toBe(0);
            expect(response.body.pagination.total).toBe(0);
        });
    });
});
