import { Request, Response } from 'express';
import prisma from '../prismaClient.js';

// Create a homework assignment (Async Match)
export const createHomeworkMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { quizId, classroomId, deadline, strictMode } = req.body;
        const hostId = req.userId;

        if (!hostId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        // Validate classroom ownership
        const classroom = await prisma.classroom.findUnique({
            where: { id: Number(classroomId) }
        });

        if (!classroom || classroom.teacherId !== Number(hostId)) {
            res.status(403).json({ message: 'You do not have permission to assign to this classroom' });
            return;
        }

        const match = await prisma.match.create({
            data: {
                quizId: Number(quizId),
                hostId: Number(hostId),
                mode: 'HOMEWORK',
                classroomId: Number(classroomId),
                deadline: deadline ? new Date(deadline) : null,
                strictMode: !!strictMode,
            },
            include: {
                quiz: { select: { title: true } }
            }
        });

        res.status(201).json(match);
    } catch (error) {
        console.error('Create homework error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Start a homework (Student)
export const startHomework = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // matchId
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const match = await prisma.match.findUnique({
            where: { id: Number(id) },
            include: { quiz: true }
        });

        if (!match || match.mode !== 'HOMEWORK') {
            res.status(404).json({ message: 'Homework not found' });
            return;
        }

        // Check deadline
        if (match.deadline && new Date() > match.deadline) {
            res.status(400).json({ message: 'Homework deadline has passed' });
            return;
        }

        // Check if student belongs to the classroom
        if (match.classroomId) {
            const isMember = await prisma.classroomMember.findUnique({
                where: {
                    classroomId_userId: {
                        classroomId: match.classroomId,
                        userId: Number(userId)
                    }
                }
            });
            if (!isMember) {
                res.status(403).json({ message: 'You are not in this classroom' });
                return;
            }
        }

        // Get user details for participant
        const user = await prisma.user.findUnique({ where: { id: Number(userId) } });

        // Upsert participant
        const participant = await prisma.matchParticipant.upsert({
            where: {
                matchId_userId: { matchId: match.id, userId: Number(userId) }
            },
            update: {
                status: 'IN_PROGRESS',
                startTime: new Date()
            },
            create: {
                matchId: match.id,
                userId: Number(userId),
                displayName: user?.username || 'Student',
                status: 'IN_PROGRESS',
                startTime: new Date()
            }
        });

        res.status(200).json({ participant, message: 'Homework started successfully' });
    } catch (error) {
        console.error('Start homework error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Submit an answer for homework
export const submitHomeworkAnswer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // matchId
        const { questionId, answerData, isCorrect, score, timeTaken } = req.body;
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const participant = await prisma.matchParticipant.findUnique({
            where: { matchId_userId: { matchId: Number(id), userId: Number(userId) } }
        });

        if (!participant || participant.status !== 'IN_PROGRESS') {
            res.status(400).json({ message: 'You have not started or already finished this homework' });
            return;
        }

        // Save answer
        const answer = await prisma.matchAnswer.create({
            data: {
                participantId: participant.id,
                questionId: Number(questionId),
                answerData: answerData || {}, // JSON
                isCorrect: !!isCorrect,
                score: Number(score || 0),
                timeTaken: Number(timeTaken || 0)
            }
        });

        res.status(201).json({ message: 'Answer recorded', answer });
    } catch (error) {
        console.error('Submit homework answer error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// Finish homework
export const finishHomework = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params; // matchId
        const userId = req.userId;

        if (!userId) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        const participant = await prisma.matchParticipant.update({
            where: { matchId_userId: { matchId: Number(id), userId: Number(userId) } },
            data: {
                status: 'SUBMITTED',
                endTime: new Date()
            },
            include: {
                answers: true
            }
        });

        // Calculate total score
        const totalScore = participant.answers.reduce((sum, ans) => sum + ans.score, 0);

        // Update or create MatchResult
        await prisma.matchResult.create({
            data: {
                userId: Number(userId),
                matchId: Number(id),
                score: totalScore
            }
        });

        res.status(200).json({ message: 'Homework submitted successfully', totalScore });
    } catch (error) {
        console.error('Finish homework error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
