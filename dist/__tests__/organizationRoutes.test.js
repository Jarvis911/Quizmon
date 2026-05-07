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
jest.unstable_mockModule('../services/azureBlobService.js', () => ({
    __esModule: true,
    uploadBufferToAzure: jest.fn().mockResolvedValue('http://example.com/image.jpg'),
}));
const { default: request } = await import('supertest');
const { default: app } = await import('../app.js');
describe('Organization Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('POST /organizations', () => {
        it('should create a new organization', async () => {
            const mockOrg = {
                id: 1,
                name: 'Test School',
                slug: 'test-school-abc1',
                logoUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                members: [
                    {
                        id: 1,
                        role: 'OWNER',
                        organizationId: 1,
                        userId: 1,
                        joinedAt: new Date(),
                        user: { id: 1, username: 'testuser', email: 'test@test.com' },
                    },
                ],
            };
            prismaMock.organization.create.mockResolvedValue(mockOrg);
            const response = await request(app)
                .post('/organizations')
                .send({ name: 'Test School' });
            expect(response.status).toBe(201);
            expect(response.body.name).toBe('Test School');
            expect(response.body.members).toHaveLength(1);
            expect(response.body.members[0].role).toBe('OWNER');
        });
        it('should return 400 if name is missing', async () => {
            const response = await request(app)
                .post('/organizations')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body.message).toContain('required');
        });
    });
    describe('GET /organizations', () => {
        it('should list user organizations', async () => {
            const mockOrgs = [
                {
                    id: 1,
                    name: 'Org 1',
                    slug: 'org-1',
                    logoUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    _count: { members: 2, quizzes: 5, classrooms: 1 },
                    subscriptions: [],
                },
            ];
            prismaMock.organization.findMany.mockResolvedValue(mockOrgs);
            const response = await request(app).get('/organizations');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0].name).toBe('Org 1');
        });
    });
    describe('GET /organizations/:id', () => {
        it('should get organization details when user is member', async () => {
            const mockOrg = {
                id: 1,
                name: 'My Org',
                slug: 'my-org',
                logoUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                members: [
                    {
                        id: 1,
                        role: 'OWNER',
                        organizationId: 1,
                        userId: 1,
                        joinedAt: new Date(),
                        user: { id: 1, username: 'testuser', email: 'test@test.com' },
                    },
                ],
                subscriptions: [],
                _count: { quizzes: 0, classrooms: 0, matches: 0 },
            };
            prismaMock.organization.findUnique.mockResolvedValue(mockOrg);
            const response = await request(app).get('/organizations/1');
            expect(response.status).toBe(200);
            expect(response.body.name).toBe('My Org');
        });
        it('should return 404 for non-existent org', async () => {
            prismaMock.organization.findUnique.mockResolvedValue(null);
            const response = await request(app).get('/organizations/999');
            expect(response.status).toBe(404);
        });
    });
    describe('PUT /organizations/:id', () => {
        it('should update org when user is admin', async () => {
            const mockMember = {
                id: 1,
                role: 'OWNER',
                organizationId: 1,
                userId: 1,
                joinedAt: new Date(),
            };
            prismaMock.organizationMember.findUnique.mockResolvedValue(mockMember);
            const mockUpdated = {
                id: 1,
                name: 'Updated Name',
                slug: 'updated-name-abc1',
                logoUrl: null,
                createdAt: new Date(),
                updatedAt: new Date(),
                members: [],
            };
            prismaMock.organization.update.mockResolvedValue(mockUpdated);
            const response = await request(app)
                .put('/organizations/1')
                .send({ name: 'Updated Name' });
            expect(response.status).toBe(200);
            expect(response.body.name).toBe('Updated Name');
        });
        it('should return 403 for non-admin user', async () => {
            const mockMember = {
                id: 1,
                role: 'MEMBER',
                organizationId: 1,
                userId: 1,
                joinedAt: new Date(),
            };
            prismaMock.organizationMember.findUnique.mockResolvedValue(mockMember);
            const response = await request(app)
                .put('/organizations/1')
                .send({ name: 'Hacked Name' });
            expect(response.status).toBe(403);
        });
    });
    describe('POST /organizations/:id/members', () => {
        it('should add a member when user is admin', async () => {
            // Mock auth user as OWNER
            prismaMock.organizationMember.findUnique.mockResolvedValue({
                id: 1,
                role: 'OWNER',
                organizationId: 1,
                userId: 1,
                joinedAt: new Date(),
            });
            // Mock target user exists
            prismaMock.user.findUnique.mockResolvedValue({
                id: 2,
                username: 'newuser',
                email: 'new@test.com',
            });
            // Mock member creation
            prismaMock.organizationMember.create.mockResolvedValue({
                id: 2,
                role: 'MEMBER',
                organizationId: 1,
                userId: 2,
                joinedAt: new Date(),
                user: { id: 2, username: 'newuser', email: 'new@test.com' },
            });
            const response = await request(app)
                .post('/organizations/1/members')
                .send({ userId: 2 });
            expect(response.status).toBe(201);
        });
    });
});
