import { Request, Response } from 'express';
import cloudinary from '../utils/cloudinary.js';
import prisma from '../prismaClient.js';

interface CreateQuizBody {
    title: string;
    description: string;
    isPublic?: boolean;
    categoryId: string | number;
}

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
    const { title, description, isPublic, categoryId } = req.body as CreateQuizBody;
    const imageFile = req.file;
    let imageUrl: string | null = null;
    const creatorId = req.userId;

    try {
        if (imageFile) {
            const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result as { secure_url: string });
                    }
                );
                uploadStream.end(imageFile.buffer);
            });
            imageUrl = uploadResult.secure_url;
        }

        const data = await prisma.quiz.create({
            data: {
                title,
                description,
                image: imageUrl,
                isPublic: !!isPublic,
                creatorId: Number(creatorId),
                categoryId: Number(categoryId),
            },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
                category: {
                    select: { id: true, name: true },
                },
            },
        });

        res.status(201).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await prisma.quiz.findMany({
            where: {
                creatorId: Number(req.userId),
            },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
                category: {
                    select: { id: true, name: true },
                },
            },
        });

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getRetrieveQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const data = await prisma.quiz.findUnique({
            where: {
                id: Number(id),
            },
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
                creator: {
                    select: { id: true, username: true },
                },
            },
        });

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getQuestionByQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const data = await prisma.question.findMany({
            where: {
                quizId: Number(id),
            },
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
        });

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getQuizRating = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const ratings = await prisma.quizRating.findMany({
            where: { quizId: Number(id) },
            select: {
                id: true,
                userId: true,
                rating: true,
                text: true,
            },
        });

        const avgScore =
            ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0;

        res.status(200).json({
            average: avgScore,
            count: ratings.length,
            ratings,
        });
    } catch (err) {
        const error = err as Error;
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

export const checkUserRateQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    const { id } = req.params;

    try {
        const existingRating = await prisma.quizRating.findFirst({
            where: {
                userId: Number(userId),
                quizId: Number(id),
            },
        });

        res.status(200).json({ rated: !!existingRating });
    } catch (err) {
        const error = err as Error;
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
