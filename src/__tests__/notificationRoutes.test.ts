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

describe('Notification Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /notifications', () => {
        it('should get all notifications for a user', async () => {
            const mockNotifications = [{ id: 1, message: 'Test Notification', userId: 1 }];
            (prismaMock as any).notification.findMany.mockResolvedValue(mockNotifications as any);

            const response = await request(app).get('/notifications');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
    });

    describe('PUT /notifications/read-all', () => {
        it('should mark all notifications as read', async () => {
            (prismaMock as any).notification.updateMany.mockResolvedValue({ count: 5 } as any);

            const response = await request(app).put('/notifications/read-all');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('All notifications marked as read');
        });
    });

    describe('PUT /notifications/:id/read', () => {
        it('should mark a specific notification as read', async () => {
            const mockNotification = { id: 1, userId: 1, isRead: false };
            (prismaMock as any).notification.findUnique.mockResolvedValue(mockNotification as any);
            (prismaMock as any).notification.update.mockResolvedValue({ ...mockNotification, isRead: true } as any);

            const response = await request(app).put('/notifications/1/read');

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Notification marked as read');
        });

        it('should return 404 if notification not found or unauthorized', async () => {
            const mockNotification = { id: 1, userId: 2, isRead: false }; // Belongs to user 2
            (prismaMock as any).notification.findUnique.mockResolvedValue(mockNotification as any);

            const response = await request(app).put('/notifications/1/read');

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Notification not found or unauthorized');
        });
    });
});
