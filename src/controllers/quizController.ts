import { Request, Response } from 'express';
import { uploadBufferToAzure } from '../services/azureBlobService.js';
import prisma from '../prismaClient.js';
import { notificationService } from '../services/notificationService.js';

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
            imageUrl = await uploadBufferToAzure(imageFile.buffer, imageFile.originalname, imageFile.mimetype);
        }

        const data = await prisma.quiz.create({
            data: {
                title,
                description,
                image: imageUrl,
                isPublic: !!isPublic,
                creatorId: Number(creatorId),
                categoryId: Number(categoryId),
                organizationId: req.organizationId ?? null,
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

        // Send notification
        await notificationService.createNotification(
            Number(creatorId),
            `Bạn đã tạo thành công bộ câu hỏi: ${data.title}`,
            'QUIZ_CREATED',
            `/library/${data.id}`
        );

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
                ...(req.organizationId ? { organizationId: req.organizationId } : {}),
            },
            orderBy: { id: 'asc' },
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
                    orderBy: { id: 'asc' },
                    include: {
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

export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title, description, isPublic, categoryId, removeImage } = req.body;
    const imageFile = req.file;
    const userId = Number(req.userId);

    try {
        // Ownership check
        const existingQuiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: { creatorId: true, organizationId: true },
        });

        if (!existingQuiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (existingQuiz.creatorId !== userId) {
            // If the user name is not the creator, check if they belong to the same organization
            // and have appropriate permissions (optional, but good for SaaS)
            if (req.organizationId && existingQuiz.organizationId === req.organizationId) {
                // Allow if in same org (basic implementation)
            } else {
                res.status(403).json({ message: 'You do not have permission to update this quiz' });
                return;
            }
        }

        let imageUrl: string | null | undefined = undefined;
        if (imageFile) {
            imageUrl = await uploadBufferToAzure(imageFile.buffer, imageFile.originalname, imageFile.mimetype);
        } else if (removeImage === 'true' || removeImage === true) {
            imageUrl = null;
        }

        // Fix isPublic conversion (multipart/form-data sends boolean as strings)
        let publicValue: boolean | undefined = undefined;
        if (isPublic !== undefined) {
            publicValue = String(isPublic) === 'true';
        }

        const data = await prisma.quiz.update({
            where: {
                id: Number(id),
            },
            data: {
                title: title !== undefined ? title : undefined,
                description: description !== undefined ? description : undefined,
                ...(imageUrl !== undefined && { image: imageUrl }),
                isPublic: publicValue,
                categoryId: categoryId ? Number(categoryId) : undefined,
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

        // Send notification
        await notificationService.createNotification(
            userId,
            `Bạn đã cập nhật bộ câu hỏi: ${data.title}`,
            'QUIZ_UPDATED',
            `/library/${data.id}`
        );

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        console.error('Update Quiz Error:', error);
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
            orderBy: { id: 'asc' },
            include: {
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
