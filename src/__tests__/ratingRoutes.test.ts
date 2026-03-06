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

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('Rating Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /rating', () => {
        it('should submit a rating successfully', async () => {
            const mockPlayed = {
                id: 1, userId: 1, matchId: 1, score: 100, match: { quizId: 1 }
            };
            const mockRating = { id: 1, userId: 1, quizId: 1, rating: 5, text: 'Great' };

            prismaMock.matchResult.findFirst.mockResolvedValue(mockPlayed as any);
            prismaMock.quizRating.findFirst.mockResolvedValue(null);
            prismaMock.quizRating.create.mockResolvedValue(mockRating as any);

            const response = await request(app)
                .post('/rating')
                .send({ quizId: 1, rating: 5, text: 'Great' });

            expect(response.status).toBe(201);
            expect(response.body.rating).toBe(5);
        });

        it('should fail if user has not played the quiz', async () => {
            prismaMock.matchResult.findFirst.mockResolvedValue(null);

            const response = await request(app)
                .post('/rating')
                .send({ quizId: 1, rating: 5, text: 'Great' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Bạn chưa từng chơi quiz này');
        });

        it('should fail if user has already rated', async () => {
            const mockPlayed = {
                id: 1, userId: 1, matchId: 1, score: 100, match: { quizId: 1 }
            };
            const mockRating = { id: 1, userId: 1, quizId: 1, rating: 5, text: 'Great' };

            prismaMock.matchResult.findFirst.mockResolvedValue(mockPlayed as any);
            prismaMock.quizRating.findFirst.mockResolvedValue(mockRating as any);

            const response = await request(app)
                .post('/rating')
                .send({ quizId: 1, rating: 5, text: 'Great' });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Bạn đã đánh giá quiz này rồi');
        });
    });
});
