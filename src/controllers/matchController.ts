import { Request, Response } from 'express';
import prisma from '../prismaClient.js';

interface CreateMatchBody {
    quizId: string | number;
}

interface UpdateMatchBody {
    startTime?: Date;
    endTime?: Date;
}

export const createMatch = async (req: Request, res: Response): Promise<void> => {
    try {
        const { quizId } = req.body as CreateMatchBody;
        const hostId = req.userId;
        const match = await prisma.match.create({
            data: {
                quizId: Number(quizId),
                hostId: Number(hostId),
            },
        });

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
                host: true,
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
                host: true,
                matchResults: true,
            },
        });

        res.status(200).json(match);
    } catch (err) {
        res.status(500).json(err);
    }
};
