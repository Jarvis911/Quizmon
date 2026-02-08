import { Request, Response } from 'express';
import prisma from '../prismaClient.js';

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.userId);
        const { period } = req.query as { period?: string };

        const now = new Date();
        const fromDate = new Date(now);
        if (period === 'week') fromDate.setDate(now.getDate() - 7);
        else fromDate.setMonth(now.getMonth() - 1);

        const results = await prisma.matchResult.findMany({
            where: {
                userId: userId,
                createdAt: { gte: fromDate },
            },
            include: {
                match: { select: { quizId: true, quiz: { select: { title: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (results.length === 0) {
            res.status(200).json({
                totalMatches: 0,
                totalQuizzes: 0,
                rankCounts: {},
                winRate: 0,
                recentMatches: [],
            });
            return;
        }

        const matchIds = [...new Set(results.map((r) => r.matchId))];

        const allResultsInMatches = await prisma.matchResult.findMany({
            where: { matchId: { in: matchIds } },
            select: { matchId: true, userId: true, score: true },
        });

        const rankCounts: Record<number, number> = {};
        const matchRankMap: Record<number, number> = {};

        for (const matchId of matchIds) {
            const scores = allResultsInMatches
                .filter((r) => r.matchId === matchId)
                .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

            const rank = scores.findIndex((r) => r.userId === userId) + 1;
            if (rank > 0) {
                rankCounts[rank] = (rankCounts[rank] || 0) + 1;
                matchRankMap[matchId] = rank;
            }
        }

        const totalMatches = results.length;
        const totalQuizzes = new Set(results.map((r) => r.match.quizId)).size;
        const winRate = totalMatches > 0 ? (rankCounts[1] || 0) / totalMatches : 0;

        const recentMatches = results.slice(0, 100).map((r) => ({
            matchId: r.matchId,
            quizId: r.match.quizId,
            quizName: r.match.quiz.title,
            createdAt: r.createdAt,
            score: r.score,
            rank: matchRankMap[r.matchId] || null,
        }));

        res.status(200).json({
            totalMatches,
            totalQuizzes,
            rankCounts,
            winRate,
            recentMatches,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi thống kê người dùng' });
    }
};
