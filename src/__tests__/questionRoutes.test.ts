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

jest.unstable_mockModule('../services/uploadMediaService.js', () => ({
    __esModule: true,
    uploadMedia: (jest.fn() as any).mockResolvedValue([])
}));

jest.unstable_mockModule('../services/questionService.js', () => ({
    __esModule: true,
    createQuestion: (jest.fn() as any).mockResolvedValue({ id: 1, text: 'Test Question' }),
    updateQuestion: (jest.fn() as any).mockResolvedValue({ id: 1, text: 'Updated Question' }),
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('Question Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /question/buttons', () => {
        it('should create a button question', async () => {
            const response = await request(app)
                .post('/question/buttons')
                .send({ quizId: '1', text: 'Test?', options: JSON.stringify([{ text: 'A' }]) });

            expect(response.status).toBe(201);
            expect(response.body.text).toBe('Test Question');
        });
    });

    describe('PUT /question/buttons/:id', () => {
        it('should update a button question', async () => {
            const response = await request(app)
                .put('/question/buttons/1')
                .send({ quizId: '1', text: 'Update?', options: JSON.stringify([{ text: 'A' }]) });

            expect(response.status).toBe(200);
            expect(response.body.text).toBe('Updated Question');
        });
    });

    describe('POST /question/checkboxes', () => {
        it('should create a checkbox question', async () => {
            const response = await request(app)
                .post('/question/checkboxes')
                .send({ quizId: '1', text: 'Test?', options: JSON.stringify([{ text: 'A' }]) });

            expect(response.status).toBe(201);
        });
    });

    describe('PUT /question/checkboxes/:id', () => {
        it('should update a checkbox question', async () => {
            const response = await request(app)
                .put('/question/checkboxes/1')
                .send({ quizId: '1', text: 'Test?', options: JSON.stringify([{ text: 'A' }]) });

            expect(response.status).toBe(200);
        });
    });

    describe('POST /question/range', () => {
        it('should create a range question', async () => {
            const response = await request(app)
                .post('/question/range')
                .send({ quizId: '1', text: 'Test?', minValue: '0', maxValue: '10', correctValue: '5' });

            expect(response.status).toBe(201);
        });
    });

    describe('PUT /question/range/:id', () => {
        it('should update a range question', async () => {
            const response = await request(app)
                .put('/question/range/1')
                .send({ quizId: '1', text: 'Test?', minValue: '0', maxValue: '10', correctValue: '5' });

            expect(response.status).toBe(201);
        });
    });

    describe('POST /question/reorder', () => {
        it('should create a reorder question', async () => {
            const response = await request(app)
                .post('/question/reorder')
                .send({ quizId: '1', text: 'Test?', options: JSON.stringify([{ text: 'A' }]) });

            expect(response.status).toBe(201);
        });
    });

    describe('PUT /question/reorder/:id', () => {
        it('should update a reorder question', async () => {
            const response = await request(app)
                .put('/question/reorder/1')
                .send({ quizId: '1', text: 'Test?', options: JSON.stringify([{ text: 'A' }]) });

            expect(response.status).toBe(200);
        });
    });

    describe('POST /question/location', () => {
        it('should create a location question', async () => {
            const response = await request(app)
                .post('/question/location')
                .send({ quizId: '1', text: 'Test?', correctLatitude: '10', correctLongitude: '20' });

            expect(response.status).toBe(201);
        });
    });

    describe('PUT /question/location/:id', () => {
        it('should update a location question', async () => {
            const response = await request(app)
                .put('/question/location/1')
                .send({ quizId: '1', text: 'Test?', correctLatitude: '10', correctLongitude: '20' });

            expect(response.status).toBe(200);
        });
    });

    describe('POST /question/typeanswer', () => {
        it('should create a type answer question', async () => {
            const response = await request(app)
                .post('/question/typeanswer')
                .send({ quizId: '1', text: 'Test?', correctAnswer: 'Answer' });

            expect(response.status).toBe(201);
        });
    });

    describe('PUT /question/typeanswer/:id', () => {
        it('should update a type answer question', async () => {
            const response = await request(app)
                .put('/question/typeanswer/1')
                .send({ quizId: '1', text: 'Test?', correctAnswer: 'Answer' });

            expect(response.status).toBe(200);
        });
    });

    describe('GET /question/:id', () => {
        it('should retrieve a question', async () => {
            const mockQuestions = [{ id: 1, text: 'TestQuestion' }];
            (prismaMock as any).question.findMany.mockResolvedValue(mockQuestions as any);

            const response = await request(app).get('/question/1');

            expect(response.status).toBe(200);
            expect(response.body[0].text).toBe('TestQuestion');
        });
    });
});
