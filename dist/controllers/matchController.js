import prisma from '../prismaClient.js';
import { trackUsage, checkLimit } from '../services/usageService.js';
import { FeatureKey } from '@prisma/client';
export const createMatch = async (req, res) => {
    try {
        const { quizId, timePerQuestion, backgroundUrl, musicUrl } = req.body;
        const hostId = req.userId;
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức hoặc có gói cá nhân để tổ chức trận đấu.' });
            return;
        }
        const { allowed, limit, current } = await checkLimit(orgId, 'matches_hosted', FeatureKey.UNLIMITED_MATCHES);
        if (!allowed) {
            res.status(403).json({
                message: `Bạn đã đạt giới hạn tối đa ${limit} trận đấu cho giai đoạn này. Vui lòng nâng cấp gói để tiếp tục.`
            });
            return;
        }
        // Generate a random unique 6-digit PIN
        let pin = "";
        let isPinUnique = false;
        while (!isPinUnique) {
            pin = Math.floor(100000 + Math.random() * 900000).toString();
            const existingMatch = await prisma.match.findUnique({ where: { pin } });
            if (!existingMatch)
                isPinUnique = true;
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
    }
    catch (err) {
        res.status(500).json(err);
    }
};
export const getMatch = async (req, res) => {
    try {
        const id = req.params.id;
        // Try finding by internal ID first
        let match = null;
        if (!isNaN(Number(id))) {
            match = await prisma.match.findUnique({
                where: { id: Number(id) },
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
        }
        // If not found by ID, try finding by 6-digit PIN
        if (!match && id.length === 6) {
            match = await prisma.match.findUnique({
                where: { pin: id },
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
        }
        res.status(200).json(match);
    }
    catch (err) {
        res.status(500).json(err);
    }
};
export const updateMatch = async (req, res) => {
    try {
        const id = req.params.id;
        const data = req.body;
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
    }
    catch (err) {
        res.status(500).json(err);
    }
};
export const deleteMatch = async (req, res) => {
    try {
        const id = req.params.id;
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
    }
    catch (err) {
        res.status(500).json(err);
    }
};
