import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient, AIGenerationStatus, AIQuestionStatus } from '@prisma/client';
import { Request, Response, NextFunction } from 'express';

const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Must happen before importing app to intercept the module
jest.unstable_mockModule('../prismaClient.js', () => ({
    __esModule: true,
    default: prismaMock,
}));

jest.unstable_mockModule('../middleware/authMiddleware.js', () => ({
    __esModule: true,
    default: (req: Request, res: Response, next: NextFunction) => {
        req.user = { id: 1 };
        req.userId = 1;
        req.organizationId = 1;
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

jest.unstable_mockModule('../services/aiService.js', () => ({
    __esModule: true,
    generateQuestions: jest.fn(),
    regenerateQuestion: jest.fn(),
    extractPdfText: jest.fn(),
}));

jest.unstable_mockModule('../services/usageService.js', () => ({
    __esModule: true,
    trackUsage: jest.fn(),
    checkLimit: (jest.fn() as any).mockResolvedValue({ allowed: true, limit: 10, current: 0 }),
}));

jest.unstable_mockModule('../services/questionService.js', () => ({
    __esModule: true,
    createQuestion: jest.fn(),
    updateQuestion: jest.fn(),
}));

// Dynamically import app and supertest after mock is set up
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
const aiService = await import('../services/aiService.js');

describe('AI Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /ai/jobs', () => {
        it('should get all jobs for the user', async () => {
            const mockJobs = [
                {
                    id: 1,
                    userId: 1,
                    targetQuizId: 1,
                    instruction: 'Create quiz',
                    pdfUrl: null,
                    status: AIGenerationStatus.COMPLETED,
                    questionCount: 5,
                    errorMessage: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    targetQuiz: { id: 1, title: 'Sample Quiz' },
                    _count: { generatedQuestions: 5 }
                }
            ];

            prismaMock.aIGenerationJob.findMany.mockResolvedValue(mockJobs as any);

            const response = await request(app).get('/ai/jobs');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].id).toBe(1);
        });
    });

    describe('POST /ai/jobs', () => {
        it('should create a job and trigger generation successfully', async () => {
            const mockJob = {
                id: 1,
                userId: 1,
                targetQuizId: null,
                instruction: 'Test instruction',
                pdfUrl: null,
                status: AIGenerationStatus.PROCESSING,
                questionCount: 5,
                errorMessage: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockGeneratedQuestions = [
                { questionText: 'Q1', questionType: 'BUTTONS', optionsData: { options: [] } }
            ];

            const mockCompleteJob = { ...mockJob, status: AIGenerationStatus.COMPLETED, generatedQuestions: [], targetQuiz: null };

            prismaMock.aIGenerationJob.create.mockResolvedValue(mockJob as any);
            (aiService.generateQuestions as any).mockResolvedValue(mockGeneratedQuestions);
            prismaMock.aIGeneratedQuestion.createMany.mockResolvedValue({ count: 1 });
            prismaMock.aIGenerationJob.update.mockResolvedValue({ ...mockJob, status: AIGenerationStatus.COMPLETED } as any);
            prismaMock.aIGenerationJob.findUnique.mockResolvedValue(mockCompleteJob as any);

            const response = await request(app)
                .post('/ai/jobs')
                .send({
                    instruction: 'Test instruction',
                    questionCount: 5
                });

            expect(response.status).toBe(201);
            expect(response.body.status).toBe(AIGenerationStatus.COMPLETED);
            expect(aiService.generateQuestions).toHaveBeenCalledTimes(1);
        });
    });
});
