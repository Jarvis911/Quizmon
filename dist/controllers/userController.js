import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const getUserStats = async (req, res) => {
    try {
        const userId = Number(req.userId);
        const { period } = req.query;
        const now = new Date();
        const fromDate = new Date(now);
        if (period === 'week')
            fromDate.setDate(now.getDate() - 7);
        else
            fromDate.setMonth(now.getMonth() - 1);
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
        const rankCounts = {};
        const matchRankMap = {};
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi thống kê người dùng' });
    }
};
export const updateProfile = async (req, res) => {
    try {
        const userId = Number(req.userId);
        const { username, avatarUrl, bio, oldPassword, newPassword } = req.body;
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ message: 'Người dùng không tồn tại' });
            return;
        }
        const updateData = {};
        if (username)
            updateData.username = username;
        if (avatarUrl !== undefined)
            updateData.avatarUrl = avatarUrl;
        if (bio !== undefined)
            updateData.bio = bio;
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi cập nhật trang cá nhân' });
    }
};
export const uploadAvatar = async (req, res) => {
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Lỗi khi tải ảnh đại diện' });
    }
};
