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

// Get single participant (with answers — requires ownership or host)
export const getParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId, id } = req.params;
        const userId = req.userId;

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
                match: { select: { hostId: true } },
            },
        });

        if (!participant) {
            res.status(404).json({ message: 'Participant not found' });
            return;
        }

        // Only the participant themselves or the match host may see the full answer detail
        const isOwner = participant.userId !== null && participant.userId === Number(userId);
        const isHost = participant.match.hostId === Number(userId);
        if (!isOwner && !isHost) {
            res.status(403).json({ message: 'Not authorized to view this participant' });
            return;
        }

        // Omit internal match relation from the response
        const { match: _match, ...participantData } = participant;
        res.status(200).json(participantData);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Update participant (displayName, avatar)
export const updateParticipant = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId, id } = req.params;
        const userId = req.userId;
        const { displayName, avatarUrl } = req.body as UpdateParticipantBody;

        // Verify participant belongs to this match
        const existing = await prisma.matchParticipant.findFirst({
            where: { id: Number(id), matchId: Number(matchId) },
            select: { userId: true },
        });

        if (!existing) {
            res.status(404).json({ message: 'Participant not found in this match' });
            return;
        }

        // Only the participant's own user may update their display info
        if (existing.userId !== null && existing.userId !== Number(userId)) {
            res.status(403).json({ message: 'Not authorized to update this participant' });
            return;
        }

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
        const { matchId, id } = req.params;
        const userId = req.userId;

        // Verify participant belongs to this match
        const existing = await prisma.matchParticipant.findFirst({
            where: { id: Number(id), matchId: Number(matchId) },
            select: {
                userId: true,
                match: { select: { hostId: true } },
            },
        });

        if (!existing) {
            res.status(404).json({ message: 'Participant not found in this match' });
            return;
        }

        // Allow: the participant's own user OR the match host
        const isOwner = existing.userId !== null && existing.userId === Number(userId);
        const isHost = existing.match.hostId === Number(userId);
        if (!isOwner && !isHost) {
            res.status(403).json({ message: 'Not authorized to remove this participant' });
            return;
        }

        await prisma.matchParticipant.delete({
            where: { id: Number(id) },
        });

        res.status(200).json({ message: 'Left match successfully' });
    } catch (err) {
        res.status(500).json(err);
    }
};
