import prisma from '../prismaClient.js';
// Create a new classroom
export const createClassroom = async (req, res) => {
    try {
        const { name, description } = req.body;
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        // Generate a random 6-character join code
        const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        // Generate an invite link (a unique token style, but here just a uuid)
        const inviteLink = crypto.randomUUID();
        const classroom = await prisma.classroom.create({
            data: {
                name,
                description,
                joinCode,
                inviteLink,
                teacherId: Number(userId),
                organizationId: req.organizationId ?? null,
                members: {
                    create: {
                        userId: Number(userId),
                        role: 'TEACHER'
                    }
                }
            }
        });
        res.status(201).json(classroom);
    }
    catch (error) {
        console.error('Create classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
// Get classrooms the user is a member of
export const getClassrooms = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        const classrooms = await prisma.classroom.findMany({
            where: {
                members: {
                    some: { userId: Number(userId) }
                },
                ...(req.organizationId ? { organizationId: req.organizationId } : {}),
            },
            include: {
                teacher: {
                    select: { id: true, username: true, email: true }
                },
                _count: {
                    select: { members: true, assignments: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(classrooms);
    }
    catch (error) {
        console.error('Get classrooms error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
// Get a specific classroom by ID
export const getClassroomById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const classroom = await prisma.classroom.findUnique({
            where: { id: parseInt(id) },
            include: {
                teacher: { select: { id: true, username: true, email: true } },
                members: {
                    include: {
                        user: { select: { id: true, username: true, email: true } }
                    },
                    orderBy: { joinDate: 'asc' }
                },
                assignments: {
                    include: {
                        quiz: { select: { id: true, title: true, image: true, category: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
        if (!classroom) {
            res.status(404).json({ message: 'Classroom not found' });
            return;
        }
        // Check if user is a member
        const isMember = classroom.members.some((member) => member.userId === Number(userId));
        if (!isMember) {
            res.status(403).json({ message: 'You are not a member of this classroom' });
            return;
        }
        res.status(200).json(classroom);
    }
    catch (error) {
        console.error('Get classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
// Join a classroom by code
export const joinClassroom = async (req, res) => {
    try {
        const { code } = req.body;
        const userId = req.userId;
        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }
        if (!code) {
            res.status(400).json({ message: 'Join code is required' });
            return;
        }
        const classroom = await prisma.classroom.findUnique({
            where: { joinCode: code.toUpperCase() }
        });
        if (!classroom) {
            res.status(404).json({ message: 'Invalid join code' });
            return;
        }
        // Check if already a member
        const existingMember = await prisma.classroomMember.findUnique({
            where: {
                classroomId_userId: {
                    classroomId: classroom.id,
                    userId: Number(userId)
                }
            }
        });
        if (existingMember) {
            res.status(400).json({ message: 'You are already a member of this classroom' });
            return;
        }
        const member = await prisma.classroomMember.create({
            data: {
                classroomId: classroom.id,
                userId: Number(userId),
                role: 'STUDENT'
            }
        });
        res.status(201).json({ message: 'Joined successfully', classroomId: classroom.id });
    }
    catch (error) {
        console.error('Join classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
