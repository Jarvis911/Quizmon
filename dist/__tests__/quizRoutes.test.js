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
    optionalAuthMiddleware: (req, res, next) => {
        if (req.headers.authorization) {
            req.user = { id: 1 };
            req.userId = 1;
        }
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
jest.unstable_mockModule('../services/azureBlobService.js', () => ({
    __esModule: true,
    uploadBufferToAzure: jest.fn().mockResolvedValue('http://example.com/image.jpg'),
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
            prismaMock.quiz.create.mockResolvedValue(mockQuiz);
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
            prismaMock.quiz.findUnique.mockResolvedValue({ id: 1, creatorId: 1, organizationId: 1 });
            prismaMock.quiz.update.mockResolvedValue(mockUpdatedQuiz);
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
            prismaMock.quiz.findMany.mockResolvedValue(mockQuizzes);
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
            });
            prismaMock.question.findMany.mockResolvedValue(mockQuestions);
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
            });
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
            });
            prismaMock.question.findMany.mockResolvedValue(mockQuestions);
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
            prismaMock.quiz.findUnique.mockResolvedValue(mockQuiz);
            const response = await request(app).get('/quiz/1');
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(1);
        });
        it('should block unauthenticated access to a private quiz', async () => {
            const mockQuiz = { id: 1, title: 'Private Quiz', isPublic: false, creatorId: 1, organizationId: null };
            prismaMock.quiz.findUnique.mockResolvedValue(mockQuiz);
            const response = await request(app).get('/quiz/1');
            expect(response.status).toBe(403);
        });
        it('should allow organization members to retrieve private organization quizzes', async () => {
            const mockQuiz = { id: 1, title: 'Org Quiz', isPublic: false, creatorId: 2, organizationId: 1 };
            prismaMock.quiz.findUnique.mockResolvedValue(mockQuiz);
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
            prismaMock.quizRating.findFirst.mockResolvedValue(mockRating);
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
            prismaMock.quizRating.findMany.mockResolvedValue(mockRatings);
            const response = await request(app).get('/quiz/1/rating');
            expect(response.status).toBe(200);
            expect(response.body.count).toBe(2);
            expect(response.body.average).toBe(4);
        });
    });
});
