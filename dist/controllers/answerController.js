import prisma from '../prismaClient.js';
// Submit answer
export const createAnswer = async (req, res) => {
    try {
        const { matchId } = req.params;
        const { questionId, participantId, answerData, isCorrect, score, timeTaken } = req.body;
        const answer = await prisma.matchAnswer.create({
            data: {
                questionId: Number(questionId),
                participantId: Number(participantId),
                answerData,
                isCorrect,
                score: Number(score),
                timeTaken: timeTaken ? Number(timeTaken) : null,
            },
            include: {
                question: { select: { id: true, text: true, type: true } },
                participant: { select: { id: true, displayName: true } },
            },
        });
        res.status(201).json(answer);
    }
    catch (err) {
        res.status(500).json(err);
    }
};
// Get all answers for a match (for reports)
export const getMatchAnswers = async (req, res) => {
    try {
        const { matchId } = req.params;
        const match = await prisma.match.findUnique({
            where: { id: Number(matchId) },
            include: {
                participants: {
                    include: {
                        answers: {
                            include: {
                                question: { select: { id: true, text: true, type: true } },
                            },
                            orderBy: { answeredAt: 'asc' },
                        },
                        user: { select: { id: true, username: true } },
                    },
                },
                quiz: {
                    include: {
                        questions: { select: { id: true, text: true, type: true } },
                    },
                },
            },
        });
        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }
        // Calculate summary statistics
        const summary = {
            match,
            statistics: {
                totalParticipants: match.participants.length,
                totalQuestions: match.quiz.questions.length,
                participantStats: match.participants.map(p => ({
                    participantId: p.id,
                    displayName: p.displayName,
                    totalScore: p.answers.reduce((sum, a) => sum + a.score, 0),
                    correctAnswers: p.answers.filter(a => a.isCorrect).length,
                    averageTime: p.answers.length > 0
                        ? p.answers.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / p.answers.length
                        : 0,
                })),
            },
        };
        res.status(200).json(summary);
    }
    catch (err) {
        res.status(500).json(err);
    }
};
// Get participant's answers
export const getParticipantAnswers = async (req, res) => {
    try {
        const { matchId, participantId } = req.params;
        const answers = await prisma.matchAnswer.findMany({
            where: {
                participantId: Number(participantId),
                participant: { matchId: Number(matchId) },
            },
            include: {
                question: {
                    include: {
                        options: true,
                    },
                },
            },
            orderBy: { answeredAt: 'asc' },
        });
        res.status(200).json(answers);
    }
    catch (err) {
        res.status(500).json(err);
    }
};
