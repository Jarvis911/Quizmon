import prisma from '../prismaClient.js';
export const createCategory = async (req, res) => {
    const { name } = req.body;
    try {
        const newCategory = await prisma.quizCategory.create({
            data: {
                name,
            },
        });
        res.status(201).json(newCategory);
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
export const getCategory = async (req, res) => {
    try {
        const categories = await prisma.quizCategory.findMany();
        res.status(200).json(categories);
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
export const getQuizByCate = async (req, res) => {
    try {
        const { id } = req.params;
        const quizzes = await prisma.quiz.findMany({
            where: {
                categoryId: Number(id),
                isPublic: true,
            },
            orderBy: { id: 'asc' },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
            },
        });
        res.status(200).json(quizzes);
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
