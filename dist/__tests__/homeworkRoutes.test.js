import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { mockDeep } from 'jest-mock-extended';
const prismaMock = mockDeep();
jest.unstable_mockModule('../prismaClient.js', () => ({
    __esModule: true,
    default: prismaMock,
}));
jest.unstable_mockModule('../services/emailService.js', () => ({
    __esModule: true,
    emailService: {
        sendEmail: jest.fn().mockResolvedValue(true)
    }
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
const { emailService } = await import('../services/emailService.js');
describe('Homework Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /homework', () => {
        it('should create a homework assignment', async () => {
            const mockClassroom = { id: 1, teacherId: 1 }; // Teacher matches user ID
            const mockMatch = { id: 1, quizId: 1, hostId: 1, classroomId: 1, quiz: { title: 'Math Quiz' } };
            const mockStudents = [
                { user: { id: 2, email: 'student@example.com', username: 'student' } }
            ];
            prismaMock.classroom.findUnique.mockResolvedValue(mockClassroom);
            prismaMock.match.create.mockResolvedValue(mockMatch);
            prismaMock.classroomMember.findMany.mockResolvedValue(mockStudents);
            prismaMock.notification.createMany.mockResolvedValue({ count: 1 });
            const response = await request(app)
                .post('/homework')
                .send({ quizId: 1, classroomId: 1, strictMode: true });
            expect(response.status).toBe(201);
            expect(response.body.id).toBe(1);
            // We use setImmediate or similar trick if promises are unresolved, 
            // but in the controller, Promise.all(emailPromises) is float.
            // We can wait a tiny bit for it to resolve.
            await new Promise(r => setTimeout(r, 0));
            expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
        });
        it('should fail if user is not teacher of classroom', async () => {
            const mockClassroom = { id: 1, teacherId: 2 }; // Teacher DOES NOT match user ID (1)
            prismaMock.classroom.findUnique.mockResolvedValue(mockClassroom);
            const response = await request(app)
                .post('/homework')
                .send({ quizId: 1, classroomId: 1 });
            expect(response.status).toBe(403);
            expect(response.body.message).toBe('You do not have permission to assign to this classroom');
        });
    });
    describe('POST /homework/:id/start', () => {
        it('should start a homework', async () => {
            const mockMatch = { id: 1, mode: 'HOMEWORK', classroomId: 1, deadline: null, quiz: {} };
            const mockClassroomMember = { classroomId: 1, userId: 1 };
            const mockUser = { id: 1, username: 'testuser' };
            const mockParticipant = { id: 1, matchId: 1, userId: 1, status: 'IN_PROGRESS' };
            prismaMock.match.findUnique.mockResolvedValue(mockMatch);
            prismaMock.classroomMember.findUnique.mockResolvedValue(mockClassroomMember);
            prismaMock.user.findUnique.mockResolvedValue(mockUser);
            prismaMock.matchParticipant.upsert.mockResolvedValue(mockParticipant);
            const response = await request(app).post('/homework/1/start');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Homework started successfully');
        });
        it('should fail if homework deadline passed', async () => {
            const pastDeadline = new Date();
            pastDeadline.setFullYear(pastDeadline.getFullYear() - 1); // 1 year ago
            const mockMatch = { id: 1, mode: 'HOMEWORK', classroomId: 1, deadline: pastDeadline, quiz: {} };
            prismaMock.match.findUnique.mockResolvedValue(mockMatch);
            const response = await request(app).post('/homework/1/start');
            expect(response.status).toBe(400);
            expect(response.body.message).toBe('Homework deadline has passed');
        });
    });
    describe('POST /homework/:id/answer', () => {
        it('should submit an answer for homework', async () => {
            const mockParticipant = { id: 1, matchId: 1, userId: 1, status: 'IN_PROGRESS' };
            const mockAnswer = { id: 1, participantId: 1, questionId: 1, score: 100 };
            prismaMock.matchParticipant.findUnique.mockResolvedValue(mockParticipant);
            prismaMock.matchAnswer.create.mockResolvedValue(mockAnswer);
            const response = await request(app)
                .post('/homework/1/answer')
                .send({ questionId: 1, answerData: { text: 'A' }, isCorrect: true, score: 100, timeTaken: 10 });
            expect(response.status).toBe(201);
            expect(response.body.message).toBe('Answer recorded');
        });
    });
    describe('POST /homework/:id/finish', () => {
        it('should finish homework', async () => {
            const mockParticipant = {
                id: 1, matchId: 1, userId: 1, status: 'SUBMITTED',
                answers: [{ score: 100 }, { score: 50 }]
            };
            const mockResult = { id: 1, matchId: 1, userId: 1, score: 150 };
            prismaMock.matchParticipant.update.mockResolvedValue(mockParticipant);
            prismaMock.matchResult.create.mockResolvedValue(mockResult);
            const response = await request(app).post('/homework/1/finish');
            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Homework submitted successfully');
            expect(response.body.totalScore).toBe(150);
        });
    });
});
