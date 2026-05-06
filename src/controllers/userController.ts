import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { emailService } from '../services/emailService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getUserStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.userId);
        const { period, from, to, page, limit } = req.query as {
            period?: string;
            from?: string;
            to?: string;
            page?: string;
            limit?: string;
        };

        const now = new Date();
        const periodFromDate = new Date(now);
        if (period === 'week') periodFromDate.setDate(now.getDate() - 7);
        else periodFromDate.setMonth(now.getMonth() - 1);

        const parseDate = (s?: string): Date | undefined => {
            if (!s) return undefined;
            const d = new Date(s);
            return Number.isNaN(d.getTime()) ? undefined : d;
        };

        // Prefer explicit from/to over period
        const fromDate = parseDate(from) ?? periodFromDate;
        const toDate = parseDate(to) ?? undefined;

        const parsedLimit = Math.max(1, Math.min(100, Number(limit ?? 20)));
        const parsedPage = Math.max(1, Number(page ?? 1));
        const skip = (parsedPage - 1) * parsedLimit;

        const whereClause = {
            userId: userId,
            createdAt: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
            },
        } as const;

        const [totalMatches, results] = await Promise.all([
            prisma.matchResult.count({ where: whereClause }),
            prisma.matchResult.findMany({
                where: whereClause,
                include: {
                    match: { select: { quizId: true, quiz: { select: { title: true } } } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: parsedLimit,
            }),
        ]);

        if (results.length === 0) {
            res.status(200).json({
                totalMatches: 0,
                totalQuizzes: 0,
                rankCounts: {},
                winRate: 0,
                recentMatches: [],
                pagination: {
                    page: parsedPage,
                    limit: parsedLimit,
                    total: 0,
                    totalPages: 0,
                    from: fromDate,
                    to: toDate ?? null,
                },
            });
            return;
        }

        // To compute rank within each match, we need results for all players in the matches
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

        const totalPages = Math.ceil(totalMatches / parsedLimit);
        const totalQuizzes = new Set(results.map((r) => r.match.quizId)).size;
        // winRate here is within the returned slice window, not global
        const sliceMatches = results.length;
        const winRate = sliceMatches > 0 ? (rankCounts[1] || 0) / sliceMatches : 0;

        const recentMatches = results.map((r) => ({
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
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total: totalMatches,
                totalPages,
                from: fromDate,
                to: toDate ?? null,
            },
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi thống kê người dùng' });
    }
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.userId);
        const { username, avatarUrl, bio, oldPassword, newPassword } = req.body as { 
            username?: string; 
            avatarUrl?: string; 
            bio?: string; 
            oldPassword?: string;
            newPassword?: string;
        };

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: 'Người dùng không tồn tại' });
            return;
        }

        const updateData: any = {};
        if (username) updateData.username = username;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (bio !== undefined) updateData.bio = bio;

        if (newPassword) {
            if (!oldPassword) {
                res.status(400).json({ message: 'Vui lòng nhập mật khẩu cũ' });
                return;
            }
            if (!user.password || !bcrypt.compareSync(oldPassword, user.password)) {
                res.status(400).json({ message: 'Mật khẩu cũ không chính xác' });
                return;
            }
            updateData.password = bcrypt.hashSync(newPassword, 8);
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                bio: true,
                createdAt: true,
                updatedAt: true
            }
        });

        res.status(200).json({
            message: 'Cập nhật trang cá nhân thành công',
            user: updatedUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi cập nhật trang cá nhân' });
    }
};

export const uploadAvatar = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.userId);
        if (!req.file) {
            res.status(400).json({ message: 'Vui lòng chọn ảnh' });
            return;
        }

        const fileName = `avatar-${userId}-${Date.now()}${path.extname(req.file.originalname)}`;
        const uploadPath = path.join(__dirname, '../../public/uploads/avatars', fileName);

        fs.writeFileSync(uploadPath, req.file.buffer);

        const avatarUrl = `/uploads/avatars/${fileName}`;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                username: true,
                email: true,
                avatarUrl: true,
                bio: true,
            }
        });

        res.status(200).json({
            message: 'Tải ảnh đại diện thành công',
            user: updatedUser
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi tải ảnh đại diện' });
    }
};

