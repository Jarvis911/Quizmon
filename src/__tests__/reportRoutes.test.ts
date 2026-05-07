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
    optionalAuthMiddleware: (req: Request, res: Response, next: NextFunction) => {
        if (req.headers.authorization) {
            req.user = { id: 1 };
            req.userId = 1;
        }
        next();
    },
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('Report Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /report/excel/:matchId', () => {
        it('should generate an excel report', async () => {
            const mockMatch = {
                id: 1, hostId: 1, createdAt: new Date(),
                quiz: { title: 'Test Quiz', description: 'Test' },
                mode: 'LIVE',
                participants: [{ id: 1, userId: 2, displayName: 'Student', answers: [{ score: 10 }] }],
                matchResults: [{ id: 1, userId: 2, user: { email: 'student@test.com' } }]
            };

            prismaMock.match.findUnique.mockResolvedValue(mockMatch as any);

            const response = await request(app).get('/reports/excel/1');

            expect(response.status).toBe(200);
            expect(response.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            expect(response.headers['content-disposition']).toContain('attachment; filename="quizmon_report_1.xlsx"');
        });

        it('should fail if match not found', async () => {
            prismaMock.match.findUnique.mockResolvedValue(null);

            const response = await request(app).get('/reports/excel/1');

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Match not found');
        });

        it('should fail if user is not host', async () => {
            const mockMatch = { id: 1, hostId: 2 }; // Not 1
            prismaMock.match.findUnique.mockResolvedValue(mockMatch as any);

            const response = await request(app).get('/reports/excel/1');

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('You do not have permission to export this report');
        });
    });
});
