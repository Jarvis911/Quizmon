import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { trackUsage, checkLimit } from '../services/usageService.js';
import { FeatureKey } from '@prisma/client';

interface CreateMatchBody {
    quizId: string | number;
    timePerQuestion?: number;
    backgroundUrl?: string;
    musicUrl?: string;
}

interface UpdateMatchBody {
    startTime?: Date;
    endTime?: Date;
    timePerQuestion?: number;
    backgroundUrl?: string;
    musicUrl?: string;
}

export const createMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { quizId, timePerQuestion, backgroundUrl, musicUrl } = req.body as CreateMatchBody;
        const hostId = req.userId;
        const orgId = req.organizationId;
        
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức hoặc có gói cá nhân để tổ chức trận đấu.' });
            return;
        }

        // Verify the caller may use this quiz (must be public, their own, or within their org)
        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(quizId) },
            select: { isPublic: true, creatorId: true, organizationId: true },
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        const canUseQuiz =
            quiz.isPublic ||
            quiz.creatorId === Number(hostId) ||
            (orgId !== undefined && quiz.organizationId === orgId);

        if (!canUseQuiz) {
            res.status(403).json({ message: 'You do not have permission to host this quiz' });
            return;
        }

        const { allowed, limit, current } = await checkLimit(
            orgId,
            'matches_hosted',
            FeatureKey.UNLIMITED_MATCHES
        );

        if (!allowed) {
            res.status(403).json({ 
                message: `Bạn đã đạt giới hạn tối đa ${limit} trận đấu cho giai đoạn này. Vui lòng nâng cấp gói để tiếp tục.` 
            });
            return;
        }

        // Generate a random unique 6-digit PIN
        let pin: string = "";
        let isPinUnique = false;
        while (!isPinUnique) {
            pin = Math.floor(100000 + Math.random() * 900000).toString();
            const existingMatch = await prisma.match.findUnique({ where: { pin } });
            if (!existingMatch) isPinUnique = true;
        }

        const match = await prisma.match.create({
            data: {
                quizId: Number(quizId),
                hostId: Number(hostId),
                pin,
                timePerQuestion: timePerQuestion ? Number(timePerQuestion) : null,
                backgroundUrl: backgroundUrl || null,
                musicUrl: musicUrl || null,
                organizationId: req.organizationId,
            },
            include: {
                quiz: true,
                host: { select: { id: true, username: true } },
            },
        });

        await trackUsage(orgId, 'matches_hosted', 1);

        res.status(201).json(match);
    } catch (err) {
        res.status(500).json(err);
    }
};

export const getMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = req.params.id as string;
        const userId = req.userId;
        const orgId = req.organizationId;

        // IMPORTANT: match lobby uses a 6-digit numeric PIN in the URL.
        // If we treat it as a numeric match ID, we'll look up `id=123456` and 404.
        // Prefer PIN when the identifier is exactly 6 digits.
        const isPin = /^\d{6}$/.test(id);
        const numericId = Number(id);
        const isNumericId = !isPin && !isNaN(numericId);

        if (!isNumericId && !isPin) {
            res.status(400).json({ message: 'Invalid match identifier' });
            return;
        }

        // Lightweight prefetch to determine caller's access level
        const matchMeta = await prisma.match.findFirst({
            where: isNumericId ? { id: numericId } : { pin: id },
            select: { id: true, hostId: true, organizationId: true },
        });

        if (!matchMeta) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }

        const isHostOrManager =
            (userId !== undefined && matchMeta.hostId === Number(userId)) ||
            (orgId !== undefined && matchMeta.organizationId === orgId);

        if (isHostOrManager) {
            // Host / org-member: full quiz data including answer keys
            const match = await prisma.match.findUnique({
                where: { id: matchMeta.id },
                include: {
                    quiz: {
                        include: {
                            questions: { include: { media: true, options: true } },
                            category: { select: { id: true, name: true } },
                        },
                    },
                    host: { select: { id: true, username: true } },
                    participants: { include: { user: { select: { id: true, username: true } } } },
                    matchResults: true,
                },
            });
            res.status(200).json(match);
        } else {
            // Participant / anonymous: answer data stripped from questions
            const match = await prisma.match.findUnique({
                where: { id: matchMeta.id },
                include: {
                    quiz: {
                        include: {
                            questions: {
                                select: {
                                    id: true,
                                    text: true,
                                    type: true,
                                    quizId: true,
                                    createdAt: true,
                                    updatedAt: true,
                                    // `data` intentionally omitted (correctAnswer, coordinates)
                                    media: true,
                                    options: { select: { id: true, text: true } },
                                },
                            },
                            category: { select: { id: true, name: true } },
                        },
                    },
                    host: { select: { id: true, username: true } },
                    participants: { include: { user: { select: { id: true, username: true } } } },
                    matchResults: true,
                },
            });
            res.status(200).json(match);
        }
    } catch (err) {
        res.status(500).json(err);
    }
};

export const updateMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const idOrPin = req.params.id as string;
        const userId = req.userId;
        const orgId = req.organizationId ?? null;
        const data = req.body as UpdateMatchBody;

        // Resolve internal ID from PIN if needed
        let matchId: number;
        if (idOrPin.length === 6 && !isNaN(Number(idOrPin))) {
            const matchRecord = await prisma.match.findUnique({
                where: { pin: idOrPin },
                select: { id: true },
            });
            if (!matchRecord) {
                res.status(404).json({ message: 'Match not found' });
                return;
            }
            matchId = matchRecord.id;
        } else {
            matchId = Number(idOrPin);
        }

        // Fetch match to verify ownership before updating
        const existing = await prisma.match.findUnique({
            where: { id: matchId },
            select: { hostId: true, organizationId: true },
        });

        if (!existing) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }

        if (existing.hostId !== Number(userId)) {
            res.status(403).json({ message: 'Not authorized to update this match' });
            return;
        }

        if (existing.organizationId !== orgId) {
            res.status(403).json({ message: 'Not authorized to update this match' });
            return;
        }

        const match = await prisma.match.update({
            where: {
                id: matchId,
            },
            data,
            include: {
                quiz: {
                    include: {
                        questions: {
                            include: {
                                media: true,
                                options: true,
                            },
                        },
                        category: {
                            select: { id: true, name: true },
                        },
                    },
                },
                host: { select: { id: true, username: true } },
                participants: true,
                matchResults: true,
            },
        });

        res.status(200).json(match);
    } catch (err) {
        res.status(500).json(err);
    }
};

export const deleteMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const idOrPin = req.params.id as string;
        const userId = req.userId;

        // Resolve internal ID from PIN if needed
        let matchId: number;
        if (idOrPin.length === 6 && !isNaN(Number(idOrPin))) {
            const matchRecord = await prisma.match.findUnique({
                where: { pin: idOrPin },
                select: { id: true, hostId: true },
            });
            if (!matchRecord) {
                res.status(404).json({ message: 'Match not found' });
                return;
            }
            matchId = matchRecord.id;
        } else {
            matchId = Number(idOrPin);
        }

        const match = await prisma.match.findUnique({
            where: { id: matchId },
        });

        if (!match || match.hostId !== Number(userId)) {
            res.status(403).json({ message: 'Not authorized to delete this match' });
            return;
        }

        await prisma.match.delete({
            where: { id: matchId },
        });

        res.status(200).json({ message: 'Match deleted successfully' });
    } catch (err) {
        res.status(500).json(err);
    }
};
