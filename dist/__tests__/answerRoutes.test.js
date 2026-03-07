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
        req.user = { id: 10 };
        req.userId = 10;
        next();
    },
}));
jest.unstable_mockModule('../services/questionService.js', () => ({
    __esModule: true,
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
}));
jest.unstable_mockModule('../services/aiService.js', () => ({
    __esModule: true,
    generateQuestions: jest.fn(),
    regenerateQuestion: jest.fn(),
    extractPdfText: jest.fn(),
}));
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
describe('Answer Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /match/:matchId/answers', () => {
        it('should submit an answer successfully', async () => {
            const mockAnswer = {
                id: 1,
                questionId: 1,
                participantId: 1,
                answerData: { selected: 'A' },
                isCorrect: true,
                score: 100,
                timeTaken: 15,
                createdAt: new Date(),
            };
            prismaMock.matchAnswer.create.mockResolvedValue(mockAnswer);
            const response = await request(app)
                .post('/match/1/answers')
                .send({
                questionId: 1,
                participantId: 1,
                answerData: { selected: 'A' },
                isCorrect: true,
                score: 100,
                timeTaken: 15
            });
            expect(response.status).toBe(201);
            expect(response.body.questionId).toBe(1);
            expect(prismaMock.matchAnswer.create).toHaveBeenCalledTimes(1);
        });
    });
    describe('GET /match/:matchId/answers', () => {
        it('should get match answers summary', async () => {
            const mockMatch = {
                id: 1,
                participants: [
                    { id: 1, displayName: 'P1', answers: [{ isCorrect: true, score: 100, timeTaken: 10 }] }
                ],
                quiz: { questions: [{ id: 1, text: 'Q1' }] }
            };
            prismaMock.match.findUnique.mockResolvedValue(mockMatch);
            const response = await request(app).get('/match/1/answers');
            expect(response.status).toBe(200);
            expect(response.body.statistics.totalParticipants).toBe(1);
            expect(response.body.statistics.totalQuestions).toBe(1);
        });
    });
    describe('GET /match/:matchId/participants/:participantId/answers', () => {
        it('should get participant answers', async () => {
            const mockAnswers = [
                { id: 1, questionId: 1, isCorrect: true, score: 100 }
            ];
            prismaMock.matchAnswer.findMany.mockResolvedValue(mockAnswers);
            const response = await request(app).get('/match/1/participants/1/answers');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
    });
});
