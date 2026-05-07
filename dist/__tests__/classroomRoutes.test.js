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
jest.unstable_mockModule('../middleware/orgMiddleware.js', () => ({
    __esModule: true,
    default: (req, res, next) => {
        req.organizationId = 1;
        next();
    },
}));
jest.unstable_mockModule('../services/featureGateService.js', () => ({
    __esModule: true,
    canUseFeature: jest.fn().mockResolvedValue({ allowed: true, limit: null }),
    getOrgFeatures: jest.fn().mockResolvedValue([]),
}));
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
describe('Classroom Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /classrooms', () => {
        it('should create a classroom', async () => {
            const mockClassroom = { id: 1, name: 'Math 101' };
            prismaMock.classroom.count.mockResolvedValue(0);
            prismaMock.classroom.create.mockResolvedValue(mockClassroom);
            const response = await request(app)
                .post('/classrooms')
                .send({ name: 'Math 101', description: 'Basic math' });
            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Math 101');
        });
    });
    describe('GET /classrooms', () => {
        it('should get all classrooms for user', async () => {
            const mockClassrooms = [{ id: 1, name: 'Math 101' }];
            prismaMock.classroom.findMany.mockResolvedValue(mockClassrooms);
            const response = await request(app).get('/classrooms');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
        });
    });
    describe('GET /classrooms/:id', () => {
        it('should get a specific classroom by ID', async () => {
            const mockClassroom = {
                id: 1,
                name: 'Math 101',
                members: [{ userId: 1 }]
            };
            prismaMock.classroom.findUnique.mockResolvedValue(mockClassroom);
            const response = await request(app).get('/classrooms/1');
            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Math 101');
        });
        it('should return 403 if user is not a member', async () => {
            const mockClassroom = {
                id: 1,
                name: 'Math 101',
                members: [{ userId: 2 }] // Different user ID
            };
            prismaMock.classroom.findUnique.mockResolvedValue(mockClassroom);
            const response = await request(app).get('/classrooms/1');
            expect(response.status).toBe(403);
            expect(response.body.message).toBe('You are not a member of this classroom');
        });
    });
    describe('POST /classrooms/join', () => {
        it('should join a classroom using invite code', async () => {
            const mockClassroom = { id: 1, joinCode: 'ABCDEF', teacherId: 2, name: 'Math 101' };
            prismaMock.classroom.findUnique.mockResolvedValue(mockClassroom);
            prismaMock.classroomMember.findUnique.mockResolvedValue(null); // Not a member yet
            prismaMock.classroomMember.create.mockResolvedValue({
                classroomId: 1,
                userId: 1,
                user: { username: 'teststudent' }
            });
            const response = await request(app)
                .post('/classrooms/join')
                .send({ code: 'ABCDEF' });
            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Yêu cầu đã được gửi. Vui lòng chờ giáo viên duyệt.');
        });
        it('should return 400 if already a member', async () => {
            const mockClassroom = { id: 1, joinCode: 'ABCDEF' };
            prismaMock.classroom.findUnique.mockResolvedValue(mockClassroom);
            prismaMock.classroomMember.findUnique.mockResolvedValue({ classroomId: 1, userId: 1 });
            const response = await request(app)
                .post('/classrooms/join')
                .send({ code: 'ABCDEF' });
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Bạn đã là thành viên của lớp học này.');
        });
    });
});
