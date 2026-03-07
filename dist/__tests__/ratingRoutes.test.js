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
            prismaMock.matchResult.findFirst.mockResolvedValue(mockPlayed);
            prismaMock.quizRating.findFirst.mockResolvedValue(null);
            prismaMock.quizRating.create.mockResolvedValue(mockRating);
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
            prismaMock.matchResult.findFirst.mockResolvedValue(mockPlayed);
            prismaMock.quizRating.findFirst.mockResolvedValue(mockRating);
            const response = await request(app)
                .post('/rating')
                .send({ quizId: 1, rating: 5, text: 'Great' });
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Bạn đã đánh giá quiz này rồi');
        });
    });
});
