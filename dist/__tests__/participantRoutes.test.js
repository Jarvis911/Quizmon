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
}));
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
describe('Participant Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /match/:matchId/participants', () => {
        it('should join match as participant', async () => {
            const mockParticipant = {
                id: 1, matchId: 1, userId: 1, displayName: 'TestUser', avatarUrl: null
            };
            prismaMock.matchParticipant.create.mockResolvedValue(mockParticipant);
            const response = await request(app)
                .post('/match/1/participants')
                .send({ displayName: 'TestUser' });
            expect(response.status).toBe(201);
            expect(response.body.displayName).toBe('TestUser');
        });
    });
    describe('GET /match/:matchId/participants', () => {
        it('should get all participants', async () => {
            const mockParticipants = [{ id: 1, displayName: 'TestUser' }];
            prismaMock.matchParticipant.findMany.mockResolvedValue(mockParticipants);
            const response = await request(app).get('/match/1/participants');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
    });
    describe('GET /match/:matchId/participants/:id', () => {
        it('should get a single participant', async () => {
            const mockParticipant = { id: 1, displayName: 'TestUser' };
            prismaMock.matchParticipant.findFirst.mockResolvedValue(mockParticipant);
            const response = await request(app).get('/match/1/participants/1');
            expect(response.status).toBe(200);
            expect(response.body.id).toBe(1);
        });
        it('should return 404 if participant not found', async () => {
            prismaMock.matchParticipant.findFirst.mockResolvedValue(null);
            const response = await request(app).get('/match/1/participants/1');
            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Participant not found');
        });
    });
    describe('PUT /match/:matchId/participants/:id', () => {
        it('should update a participant', async () => {
            const mockParticipant = { id: 1, displayName: 'UpdatedUser' };
            prismaMock.matchParticipant.update.mockResolvedValue(mockParticipant);
            const response = await request(app)
                .put('/match/1/participants/1')
                .send({ displayName: 'UpdatedUser' });
            expect(response.status).toBe(200);
            expect(response.body.displayName).toBe('UpdatedUser');
        });
    });
    describe('DELETE /match/:matchId/participants/:id', () => {
        it('should leave match', async () => {
            const mockParticipant = { id: 1 };
            prismaMock.matchParticipant.delete.mockResolvedValue(mockParticipant);
            const response = await request(app).delete('/match/1/participants/1');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Left match successfully');
        });
    });
});
