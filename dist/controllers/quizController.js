import { uploadBufferToAzure } from '../services/azureBlobService.js';
import prisma from '../prismaClient.js';
export const createQuiz = async (req, res) => {
    const { title, description, isPublic, categoryId } = req.body;
    const imageFile = req.file;
    let imageUrl = null;
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
        res.status(201).json(data);
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
export const getQuiz = async (req, res) => {
    try {
        const data = await prisma.quiz.findMany({
            where: {
                creatorId: Number(req.userId),
                ...(req.organizationId ? { organizationId: req.organizationId } : {}),
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
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
export const getRetrieveQuiz = async (req, res) => {
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
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
export const getQuestionByQuiz = async (req, res) => {
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
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
export const getQuizRating = async (req, res) => {
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
        const avgScore = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0;
        res.status(200).json({
            average: avgScore,
            count: ratings.length,
            ratings,
        });
    }
    catch (err) {
        const error = err;
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
export const checkUserRateQuiz = async (req, res) => {
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
    }
    catch (err) {
        const error = err;
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};
