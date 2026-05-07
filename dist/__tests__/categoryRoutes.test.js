import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';
const prismaMock = mockDeep();
jest.unstable_mockModule('../prismaClient.js', () => ({
    __esModule: true,
    default: prismaMock,
}));
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
describe('Category Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /category', () => {
        it('should create a new category', async () => {
            const mockCategory = { id: 1, name: 'Science' };
            prismaMock.quizCategory.create.mockResolvedValue(mockCategory);
            const response = await request(app)
                .post('/category')
                .send({ name: 'Science' });
            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Science');
        });
        it('should handle errors when creating a category', async () => {
            prismaMock.quizCategory.create.mockRejectedValue(new Error('Creation failed'));
            const response = await request(app)
                .post('/category')
                .send({ name: 'Science' });
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Creation failed');
        });
    });
    describe('GET /category', () => {
        it('should get all categories', async () => {
            const mockCategories = [{ id: 1, name: 'Science' }];
            prismaMock.quizCategory.findMany.mockResolvedValue(mockCategories);
            const response = await request(app).get('/category');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
        it('should handle errors when getting categories', async () => {
            prismaMock.quizCategory.findMany.mockRejectedValue(new Error('Fetch failed'));
            const response = await request(app).get('/category');
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Fetch failed');
        });
    });
    describe('GET /category/:id/quiz', () => {
        it('should get quizzes by category', async () => {
            const mockQuizzes = [{ id: 1, title: 'Science Quiz', categoryId: 1 }];
            prismaMock.quiz.findMany.mockResolvedValue(mockQuizzes);
            const response = await request(app).get('/category/1/quiz');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
        it('should handle errors when getting quizzes by category', async () => {
            prismaMock.quiz.findMany.mockRejectedValue(new Error('Fetch failed'));
            const response = await request(app).get('/category/1/quiz');
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Fetch failed');
        });
    });
});
