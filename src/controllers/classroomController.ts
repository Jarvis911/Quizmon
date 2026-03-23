import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { notificationService } from '../services/notificationService.js';
import { canUseFeature } from '../services/featureGateService.js';
import { FeatureKey } from '@prisma/client';
import crypto from 'crypto';

// Create a new classroom
export const createClassroom = async (req: Request, res: Response): Promise<void> => {
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

        // Enforcement: Check MAX_CLASSROOMS limit
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức hoặc có gói cá nhân để tạo lớp học.' });
            return;
        }

        const { allowed, limit } = await canUseFeature(orgId, FeatureKey.MAX_CLASSROOMS);
        if (!allowed) {
            res.status(403).json({ message: 'Tính năng tạo lớp học không có sẵn trong gói hiện tại của bạn.' });
            return;
        }

        if (limit !== null) {
            const classroomCount = await prisma.classroom.count({
                where: { organizationId: orgId }
            });

            if (classroomCount >= limit) {
                res.status(403).json({ message: `Bạn đã đạt giới hạn tối đa ${limit} lớp học cho tổ chức này.` });
                return;
            }
        }

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

        // Send notification
        await notificationService.createNotification(
            Number(userId),
            `Bạn đã tạo thành công lớp học: ${classroom.name}`,
            'CLASSROOM_CREATED',
            `/classrooms/${classroom.id}`
        );

        res.status(201).json(classroom);
    } catch (error) {
        console.error('Create classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get classrooms the user is a member of
export const getClassrooms = async (req: Request, res: Response): Promise<void> => {
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
    } catch (error) {
        console.error('Get classrooms error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Get a specific classroom by ID
export const getClassroomById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;

        const classroom = await prisma.classroom.findUnique({
            where: { id: parseInt(id as string) },
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
        const isMember = classroom.members.some((member: { userId: number }) => member.userId === Number(userId));
        if (!isMember) {
            res.status(403).json({ message: 'You are not a member of this classroom' });
            return;
        }

        res.status(200).json(classroom);
    } catch (error) {
        console.error('Get classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Join a classroom by code
export const joinClassroom = async (req: Request, res: Response): Promise<void> => {
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

        // Enforcement: Check MAX_STUDENTS_PER_CLASSROOM limit
        if (classroom.organizationId) {
            const { allowed, limit } = await canUseFeature(classroom.organizationId, FeatureKey.MAX_STUDENTS_PER_CLASSROOM);
            if (allowed && limit !== null) {
                const studentCount = await prisma.classroomMember.count({
                    where: { classroomId: classroom.id, role: 'STUDENT' }
                });

                if (studentCount >= limit) {
                    res.status(403).json({ message: `Lớp học này đã đạt giới hạn tối đa ${limit} học sinh.` });
                    return;
                }
            }
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
            },
            include: {
                user: { select: { username: true } }
            }
        });

        // Notify student
        await notificationService.createNotification(
            Number(userId),
            `Chào mừng bạn đến với lớp học: ${classroom.name}`,
            'CLASSROOM_JOINED',
            `/classrooms/${classroom.id}`
        );

        // Notify teacher
        await notificationService.createNotification(
            classroom.teacherId,
            `Học sinh ${member.user.username || 'mới'} vừa tham gia lớp: ${classroom.name}`,
            'STUDENT_JOINED',
            `/classrooms/${classroom.id}`
        );

        res.status(201).json({ message: 'Joined successfully', classroomId: classroom.id });
    } catch (error) {
        console.error('Join classroom error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
