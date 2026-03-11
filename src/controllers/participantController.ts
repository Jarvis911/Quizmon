import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { canUseFeature } from '../services/featureGateService.js';
import { FeatureKey } from '@prisma/client';

interface CreateParticipantBody {
    displayName: string;
    avatarUrl?: string;
}

interface UpdateParticipantBody {
    displayName?: string;
    avatarUrl?: string;
}

// Join match as participant
export const createParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId } = req.params;
        const { displayName, avatarUrl } = req.body as CreateParticipantBody;
        const userId = req.userId;

        // Enforcement: Check MAX_PLAYERS_PER_MATCH limit
        const match = await prisma.match.findUnique({
            where: { id: Number(matchId) },
            select: { organizationId: true }
        });

        const hostOrgId = match?.organizationId;
        
        if (hostOrgId) {
            const { allowed, limit } = await canUseFeature(hostOrgId, FeatureKey.MAX_PLAYERS_PER_MATCH);
            if (allowed && limit !== null) {
                const participantCount = await prisma.matchParticipant.count({
                    where: { matchId: Number(matchId) }
                });

                if (participantCount >= limit) {
                    res.status(403).json({ message: `Trận đấu đã đạt giới hạn tối đa ${limit} người tham gia.` });
                    return;
                }
            } else if (!allowed) {
                res.status(403).json({ message: 'Tính năng tham gia trận đấu không khả dụng cho tổ chức này.' });
                return;
            }
        }

        const participant = await prisma.matchParticipant.create({
            data: {
                matchId: Number(matchId),
                userId: userId ? Number(userId) : null,
                displayName,
                avatarUrl: avatarUrl || null,
            },
            include: {
                user: { select: { id: true, username: true } },
            },
        });

        res.status(201).json(participant);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Get all participants in a match
export const getParticipants = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId } = req.params;

        const participants = await prisma.matchParticipant.findMany({
            where: { matchId: Number(matchId) },
            include: {
                user: { select: { id: true, username: true } },
            },
            orderBy: { joinedAt: 'asc' },
        });

        res.status(200).json(participants);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Get single participant
export const getParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId, id } = req.params;

        const participant = await prisma.matchParticipant.findFirst({
            where: {
                id: Number(id),
                matchId: Number(matchId),
            },
            include: {
                user: { select: { id: true, username: true } },
                answers: {
                    include: {
                        question: { select: { id: true, text: true, type: true } },
                    },
                },
            },
        });

        if (!participant) {
            res.status(404).json({ message: 'Participant not found' });
            return;
        }

        res.status(200).json(participant);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Update participant (displayName, avatar)
export const updateParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId, id } = req.params;
        const { displayName, avatarUrl } = req.body as UpdateParticipantBody;

        const participant = await prisma.matchParticipant.update({
            where: { id: Number(id) },
            data: {
                displayName,
                avatarUrl,
            },
            include: {
                user: { select: { id: true, username: true } },
            },
        });

        res.status(200).json(participant);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Leave match (delete participant)
export const deleteParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        await prisma.matchParticipant.delete({
            where: { id: Number(id) },
        });

        res.status(200).json({ message: 'Left match successfully' });
    } catch (err) {
        res.status(500).json(err);
    }
};
