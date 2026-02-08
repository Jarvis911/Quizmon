import { Request, Response } from 'express';
import prisma from '../prismaClient.js';

export const createCategory = async (req: Request, res: Response): Promise<void> => {
    const { name } = req.body as { name: string };

    try {
        const newCategory = await prisma.quizCategory.create({
            data: {
                name,
            },
        });

        res.status(201).json(newCategory);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await prisma.quizCategory.findMany();

        res.status(200).json(categories);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getQuizByCate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const quizzes = await prisma.quiz.findMany({
            where: {
                categoryId: Number(id),
                isPublic: true,
            },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
            },
        });

        res.status(200).json(quizzes);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};
