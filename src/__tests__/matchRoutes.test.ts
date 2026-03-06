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

describe('Match Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /match', () => {
        it('should create a new match', async () => {
            const mockMatch = { id: 1, quizId: 1, hostId: 1, timePerQuestion: 30 };
            prismaMock.match.create.mockResolvedValue(mockMatch as any);

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
            prismaMock.match.findUnique.mockResolvedValue(mockMatch as any);

            const response = await request(app).get('/match/1');

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(1);
        });
    });

    describe('PUT /match/:id', () => {
        it('should update a match', async () => {
            const mockMatch = { id: 1, quizId: 1, timePerQuestion: 45 };
            prismaMock.match.update.mockResolvedValue(mockMatch as any);

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
            prismaMock.match.findUnique.mockResolvedValue(mockMatch as any);
            prismaMock.match.delete.mockResolvedValue(mockMatch as any);

            const response = await request(app).delete('/match/1');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Match deleted successfully');
        });

        it('should return 403 if not authorized', async () => {
            const mockMatch = { id: 1, hostId: 2 }; // Host DOES NOT match user ID
            prismaMock.match.findUnique.mockResolvedValue(mockMatch as any);

            const response = await request(app).delete('/match/1');

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Not authorized to delete this match');
        });
    });
});
