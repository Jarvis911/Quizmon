import prisma from '../prismaClient.js';
export const postRating = async (req, res) => {
    const userId = req.userId;
    const { quizId, rating, text } = req.body;
    try {
        const isPlayed = await prisma.matchResult.findFirst({
            where: {
                userId: userId,
                match: {
                    quizId: quizId,
                },
            },
            include: {
                match: true,
            },
        });
        if (!isPlayed) {
            res.status(400).json({ message: 'Bạn chưa từng chơi quiz này' });
            return;
        }
        const existingRating = await prisma.quizRating.findFirst({
            where: {
                userId: userId,
                quizId: quizId,
            },
        });
        if (existingRating) {
            res.status(400).json({ message: 'Bạn đã đánh giá quiz này rồi' });
            return;
        }
        const quiz_rating = await prisma.quizRating.create({
            data: {
                userId: userId,
                quizId: quizId,
                rating: rating,
                text: text,
            },
        });
        res.status(201).json(quiz_rating);
    }
    catch (err) {
        const error = err;
        res.status(400).json({ message: error.message });
    }
};
