import prisma from '../prismaClient.js';
export const createMatch = async (req, res) => {
    try {
        const { quizId, timePerQuestion, backgroundUrl, musicUrl } = req.body;
        const hostId = req.userId;
        const match = await prisma.match.create({
            data: {
                quizId: Number(quizId),
                hostId: Number(hostId),
                timePerQuestion: timePerQuestion ? Number(timePerQuestion) : null,
                backgroundUrl: backgroundUrl || null,
                musicUrl: musicUrl || null,
                organizationId: req.organizationId ?? null,
            },
            include: {
                quiz: true,
                host: { select: { id: true, username: true } },
            },
        });
        res.status(201).json(match);
    }
    catch (err) {
        res.status(500).json(err);
    }
};
export const getMatch = async (req, res) => {
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
                                button: true,
                                checkbox: true,
                                reorder: true,
                                range: true,
                                typeAnswer: true,
                                location: true,
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
    }
    catch (err) {
        res.status(500).json(err);
    }
};
export const updateMatch = async (req, res) => {
    try {
        const { id } = req.params;
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
                                button: true,
                                checkbox: true,
                                reorder: true,
                                range: true,
                                typeAnswer: true,
                                location: true,
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
    }
    catch (err) {
        res.status(500).json(err);
    }
};
