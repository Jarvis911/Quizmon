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

        const match = await prisma.match.create({
            data: {
                quizId: Number(quizId),
                hostId: Number(hostId),
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
        const { id } = req.params;

        const match = await prisma.match.findUnique({
            where: {
                id: Number(id),
            },
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
                participants: {
                    include: {
                        user: { select: { id: true, username: true } },
                    },
                },
                matchResults: true,
            },
        });

        res.status(200).json(match);
    } catch (err) {
        res.status(500).json(err);
    }
};

export const updateMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const data = req.body as UpdateMatchBody;

        const match = await prisma.match.update({
            where: {
                id: Number(id),
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
        const { id } = req.params;
        const userId = req.userId;

        const match = await prisma.match.findUnique({
            where: { id: Number(id) },
        });

        if (!match || match.hostId !== Number(userId)) {
            res.status(403).json({ message: 'Not authorized to delete this match' });
            return;
        }

        await prisma.match.delete({
            where: { id: Number(id) },
        });

        res.status(200).json({ message: 'Match deleted successfully' });
    } catch (err) {
        res.status(500).json(err);
    }
};
