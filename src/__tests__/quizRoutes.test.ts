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

jest.unstable_mockModule('../middleware/orgMiddleware.js', () => ({
    __esModule: true,
    default: (req: Request, res: Response, next: NextFunction) => {
        req.organizationId = 1;
        next();
    },
}));

jest.unstable_mockModule('../services/azureBlobService.js', () => ({
    __esModule: true,
    uploadBufferToAzure: (jest.fn() as any).mockResolvedValue('http://example.com/image.jpg'),
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('Quiz Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /quiz', () => {
        it('should create a new quiz', async () => {
            const mockQuiz = { id: 1, title: 'Math Quiz', categoryId: 1 };
            prismaMock.quiz.create.mockResolvedValue(mockQuiz as any);

            const response = await request(app)
                .post('/quiz')
                .send({ title: 'Math Quiz', description: 'Test', isPublic: true, categoryId: 1 });

            expect(response.status).toBe(201);
            expect(response.body.title).toBe('Math Quiz');
        });
    });

    describe('PUT /quiz/:id', () => {
        it('should update an existing quiz', async () => {
            const mockUpdatedQuiz = { id: 1, title: 'Updated Math Quiz', description: 'Updated' };
            prismaMock.quiz.findUnique.mockResolvedValue({ id: 1, creatorId: 1, organizationId: 1 } as any);
            prismaMock.quiz.update.mockResolvedValue(mockUpdatedQuiz as any);

            const response = await request(app)
                .put('/quiz/1')
                .send({ title: 'Updated Math Quiz', description: 'Updated' });

            expect(response.status).toBe(200);
            expect(response.body.title).toBe('Updated Math Quiz');
            expect(prismaMock.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({
                    title: 'Updated Math Quiz',
                    description: 'Updated'
                })
            }));
        });
    });

    describe('GET /quiz', () => {
        it('should get all quizzes for user', async () => {
            const mockQuizzes = [{ id: 1, title: 'Math Quiz' }];
            prismaMock.quiz.findMany.mockResolvedValue(mockQuizzes as any);

            const response = await request(app).get('/quiz');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /quiz/:id/question', () => {
        it('should get questions for a public quiz without authentication', async () => {
            const mockQuestions = [{ id: 1, text: 'Test Question' }];
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1,
                isPublic: true,
                creatorId: 2,
                organizationId: null,
            } as any);
            prismaMock.question.findMany.mockResolvedValue(mockQuestions as any);

            const response = await request(app).get('/quiz/1/question');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('should block unauthenticated access to private quiz questions', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1,
                isPublic: false,
                creatorId: 1,
                organizationId: null,
            } as any);

            const response = await request(app).get('/quiz/1/question');

            expect(response.status).toBe(403);
            expect(prismaMock.question.findMany).not.toHaveBeenCalled();
        });

        it('should allow the owner to get private quiz questions', async () => {
            const mockQuestions = [{ id: 1, text: 'Private Question' }];
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1,
                isPublic: false,
                creatorId: 1,
                organizationId: null,
            } as any);
            prismaMock.question.findMany.mockResolvedValue(mockQuestions as any);

            const response = await request(app)
                .get('/quiz/1/question')
                .set('Authorization', 'Bearer token');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /quiz/:id', () => {
        it('should retrieve a public quiz without authentication', async () => {
            const mockQuiz = { id: 1, title: 'Math Quiz', isPublic: true, creatorId: 2, organizationId: null };
            prismaMock.quiz.findUnique.mockResolvedValue(mockQuiz as any);

            const response = await request(app).get('/quiz/1');

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(1);
        });

        it('should block unauthenticated access to a private quiz', async () => {
            const mockQuiz = { id: 1, title: 'Private Quiz', isPublic: false, creatorId: 1, organizationId: null };
            prismaMock.quiz.findUnique.mockResolvedValue(mockQuiz as any);

            const response = await request(app).get('/quiz/1');

            expect(response.status).toBe(403);
        });

        it('should allow organization members to retrieve private organization quizzes', async () => {
            const mockQuiz = { id: 1, title: 'Org Quiz', isPublic: false, creatorId: 2, organizationId: 1 };
            prismaMock.quiz.findUnique.mockResolvedValue(mockQuiz as any);

            const response = await request(app)
                .get('/quiz/1')
                .set('Authorization', 'Bearer token');

            expect(response.status).toBe(200);
            expect(response.body.id).toBe(1);
        });
    });

    describe('GET /quiz/:id/rated', () => {
        it('should check if user rated the quiz', async () => {
            const mockRating = { id: 1, userId: 1, quizId: 1, rating: 5 };
            prismaMock.quizRating.findFirst.mockResolvedValue(mockRating as any);

            const response = await request(app).get('/quiz/1/rated');

            expect(response.status).toBe(200);
            expect(response.body.rated).toBe(true);
        });
    });

    describe('GET /quiz/:id/rating', () => {
        it('should get quiz rating', async () => {
            const mockRatings = [
                { id: 1, userId: 1, rating: 5, text: 'Great' },
                { id: 2, userId: 2, rating: 3, text: 'Okay' }
            ];
            prismaMock.quizRating.findMany.mockResolvedValue(mockRatings as any);

            const response = await request(app).get('/quiz/1/rating');

            expect(response.status).toBe(200);
            expect(response.body.count).toBe(2);
            expect(response.body.average).toBe(4);
        });
    });

    // ─── Checkout Lock ────────────────────────────────────────────────────────

    describe('POST /quiz/:id/checkout', () => {
        it('should acquire lock when quiz has no lock', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
                lockedById: null, lockedAt: null, lockExpiresAt: null,
                lockedBy: null,
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1 } as any);

            const res = await request(app).post('/quiz/1/checkout');

            expect(res.status).toBe(200);
            expect(res.body.locked).toBe(true);
            expect(prismaMock.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: expect.objectContaining({ lockedById: 1 }),
            }));
        });

        it('should acquire lock when existing lock has expired', async () => {
            const expiredAt = new Date(Date.now() - 1000); // 1 second in the past
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
                lockedById: 2,
                lockedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
                lockExpiresAt: expiredAt,
                lockedBy: { id: 2, username: 'other_user' },
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1 } as any);

            const res = await request(app).post('/quiz/1/checkout');

            expect(res.status).toBe(200);
            expect(res.body.locked).toBe(true);
            expect(prismaMock.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ lockedById: 1 }),
            }));
        });

        it('should return 423 when quiz is actively locked by another user', async () => {
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
                lockedById: 2,
                lockedAt: new Date(),
                lockExpiresAt: expiresAt,
                lockedBy: { id: 2, username: 'other_user' },
            } as any);

            const res = await request(app).post('/quiz/1/checkout');

            expect(res.status).toBe(423);
            expect(res.body.lockedBy).toBe('other_user');
            expect(prismaMock.quiz.update).not.toHaveBeenCalled();
        });

        it('should renew lock (extend expiry) when called by the current lock holder', async () => {
            const existingExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 min left
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
                lockedById: 1, // same user (userId=1 from mock middleware)
                lockedAt: new Date(),
                lockExpiresAt: existingExpiry,
                lockedBy: { id: 1, username: 'current_user' },
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1 } as any);

            const res = await request(app).post('/quiz/1/checkout');

            expect(res.status).toBe(200);
            expect(res.body.locked).toBe(true);
            // Lock should be renewed (new expiry will be ~2h from now, > existingExpiry)
            const renewedExpiry = new Date(res.body.lockExpiresAt);
            expect(renewedExpiry.getTime()).toBeGreaterThan(existingExpiry.getTime());
        });

        it('should return 200 without locking for personal quizzes (no org)', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: null,
                lockedById: null, lockedAt: null, lockExpiresAt: null,
                lockedBy: null,
            } as any);

            const res = await request(app).post('/quiz/1/checkout');

            expect(res.status).toBe(200);
            expect(res.body.locked).toBe(false);
            expect(prismaMock.quiz.update).not.toHaveBeenCalled();
        });

        it('should return 404 when quiz does not exist', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue(null);

            const res = await request(app).post('/quiz/999/checkout');

            expect(res.status).toBe(404);
        });
    });

    describe('POST /quiz/:id/checkin', () => {
        it('should release lock when called by the lock holder', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
                lockedById: 1, // same as userId in mock (=1)
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1 } as any);

            const res = await request(app).post('/quiz/1/checkin');

            expect(res.status).toBe(200);
            expect(prismaMock.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: { lockedById: null, lockedAt: null, lockExpiresAt: null },
            }));
        });

        it('should allow OWNER/ADMIN to release another user\'s lock', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
                lockedById: 2, // locked by user 2, but our user (1) is ADMIN
            } as any);
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1, organizationId: 1, userId: 1, role: 'ADMIN',
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1 } as any);

            const res = await request(app).post('/quiz/1/checkin');

            expect(res.status).toBe(200);
            expect(prismaMock.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
                data: { lockedById: null, lockedAt: null, lockExpiresAt: null },
            }));
        });

        it('should return 403 when non-holder without admin role tries to release', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
                lockedById: 2, // locked by user 2, our user (1) is not ADMIN
            } as any);
            prismaMock.organizationMember.findFirst.mockResolvedValue(null);

            const res = await request(app).post('/quiz/1/checkin');

            expect(res.status).toBe(403);
            expect(prismaMock.quiz.update).not.toHaveBeenCalled();
        });

        it('should return 404 when quiz does not exist', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue(null);

            const res = await request(app).post('/quiz/999/checkin');

            expect(res.status).toBe(404);
        });
    });

    describe('POST /quiz/:id/force-checkin', () => {
        it('should force-release any lock for OWNER', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
            } as any);
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1, organizationId: 1, userId: 1, role: 'OWNER',
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1 } as any);

            const res = await request(app).post('/quiz/1/force-checkin');

            expect(res.status).toBe(200);
            expect(prismaMock.quiz.update).toHaveBeenCalledWith(expect.objectContaining({
                where: { id: 1 },
                data: { lockedById: null, lockedAt: null, lockExpiresAt: null },
            }));
        });

        it('should force-release any lock for ADMIN', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
            } as any);
            prismaMock.organizationMember.findFirst.mockResolvedValue({
                id: 1, organizationId: 1, userId: 1, role: 'ADMIN',
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1 } as any);

            const res = await request(app).post('/quiz/1/force-checkin');

            expect(res.status).toBe(200);
        });

        it('should return 403 for non-OWNER/ADMIN members', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, organizationId: 1,
            } as any);
            prismaMock.organizationMember.findFirst.mockResolvedValue(null); // TEACHER or MEMBER

            const res = await request(app).post('/quiz/1/force-checkin');

            expect(res.status).toBe(403);
            expect(prismaMock.quiz.update).not.toHaveBeenCalled();
        });

        it('should return 404 when quiz does not exist', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue(null);

            const res = await request(app).post('/quiz/999/force-checkin');

            expect(res.status).toBe(404);
        });
    });

    describe('PUT /quiz/:id – lock enforcement', () => {
        it('should block update with 423 when quiz is locked by another user', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, creatorId: 1, organizationId: 1,
                lockedById: 2, // locked by user 2
                lockExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
            } as any);

            const res = await request(app)
                .put('/quiz/1')
                .send({ title: 'Attempted Edit' });

            expect(res.status).toBe(423);
            expect(prismaMock.quiz.update).not.toHaveBeenCalled();
        });

        it('should allow update when quiz is locked by the current user', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, creatorId: 1, organizationId: 1,
                lockedById: 1, // locked by user 1 (same as current user)
                lockExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1, title: 'My Edit' } as any);

            const res = await request(app)
                .put('/quiz/1')
                .send({ title: 'My Edit' });

            expect(res.status).toBe(200);
        });

        it('should allow update when lock is expired', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, creatorId: 1, organizationId: 1,
                lockedById: 2,
                lockExpiresAt: new Date(Date.now() - 5000), // expired 5s ago
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1, title: 'After Lock Expired' } as any);

            const res = await request(app)
                .put('/quiz/1')
                .send({ title: 'After Lock Expired' });

            expect(res.status).toBe(200);
        });

        it('should allow update on personal quiz regardless of lock fields', async () => {
            prismaMock.quiz.findUnique.mockResolvedValue({
                id: 1, creatorId: 1, organizationId: null,
                lockedById: null, lockExpiresAt: null,
            } as any);
            prismaMock.quiz.update.mockResolvedValue({ id: 1, title: 'Personal Quiz Edit' } as any);

            const res = await request(app)
                .put('/quiz/1')
                .send({ title: 'Personal Quiz Edit' });

            expect(res.status).toBe(200);
        });
    });
});
