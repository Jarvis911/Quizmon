import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep, DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

const prismaMock = mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Must happen before importing app to intercept the module
jest.unstable_mockModule('../prismaClient.js', () => ({
    __esModule: true,
    default: prismaMock,
}));

// Dynamically import app and supertest after mock is set up
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');

describe('Auth Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /auth/register', () => {
        it('should register a new user successfully', async () => {
            // Arrange
            const newUser = {
                id: 1,
                username: 'testuser',
                email: 'test@example.com',
                password: 'hashedpassword',
                googleId: null,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            prismaMock.user.findFirst.mockResolvedValue(null);
            prismaMock.user.create.mockResolvedValue(newUser);

            // Act
            const response = await request(app)
                .post('/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });

            // Assert
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe('testuser');
            expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
        });

        it('should return 400 if user already exists', async () => {
            // Mock Prisma constraint error
            prismaMock.user.create.mockRejectedValue(new Error('Username or Email already exists'));

            const response = await request(app)
                .post('/auth/register')
                .send({
                    username: 'testuser',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Username or Email already exists');
        });
    });
});
