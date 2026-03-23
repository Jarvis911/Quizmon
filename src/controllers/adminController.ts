import { Request, Response } from 'express';
import prisma from '../prismaClient.js';

export const getDashboardStats = async (req: Request, res: Response) => {
    try {
        // Overall stats
        const usersCount = await prisma.user.count();
        const quizzesCount = await prisma.quiz.count();
        const activeSubscriptions = await prisma.subscription.count({
            where: { status: 'ACTIVE' }
        });

        // Calculate Revenue (Sum of COMPLETED payments)
        const payments = await prisma.payment.aggregate({
            _sum: { amount: true },
            where: { status: 'COMPLETED' }
        });
        const revenue = payments._sum.amount || 0;

        // Total AI Jobs 
        const aiJobsCount = await prisma.aIGenerationJob.count();

        // Total Tokens Used
        const jobs = await prisma.aIGenerationJob.aggregate({
            _sum: { totalTokens: true }
        });
        const totalTokens = jobs._sum.totalTokens || 0;

        res.json({
            users: usersCount,
            quizzes: quizzesCount,
            activeSubscriptions,
            revenue,
            aiJobs: aiJobsCount,
            totalTokens
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const getQuizzes = async (req: Request, res: Response) => {
    try {
        const { search, categoryId } = req.query;

        const where: any = {};
        if (search) {
            where.OR = [
                { title: { contains: String(search) } },
                { creator: { username: { contains: String(search) } } }
            ];
        }
        if (categoryId) {
            where.categoryId = Number(categoryId);
        }

        const quizzes = await prisma.quiz.findMany({
            where,
            include: { creator: { select: { username: true, email: true } }, category: true },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(quizzes);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const deleteQuiz = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        await prisma.quiz.delete({ where: { id } });
        res.json({ message: 'Quiz deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const getReports = async (req: Request, res: Response) => {
    try {
        const { status, reportType } = req.query;
        
        const where: any = {};
        if (status) where.status = status;
        if (reportType) where.reportType = reportType;

        const reports = await prisma.systemReport.findMany({
            where,
            include: { reporter: { select: { username: true, email: true } } },
            orderBy: { createdAt: 'desc' }
        });
        res.json(reports);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const resolveReport = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        const { status } = req.body; // e.g., 'RESOLVED', 'DISMISSED'
        const report = await prisma.systemReport.update({
            where: { id },
            data: { status }
        });
        res.json(report);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const getUsers = async (req: Request, res: Response) => {
    try {
        const { search, isAdmin } = req.query;

        const where: any = {};
        if (search) {
            where.OR = [
                { username: { contains: String(search) } },
                { email: { contains: String(search) } }
            ];
        }
        if (isAdmin !== undefined) {
            where.isAdmin = isAdmin === 'true';
        }

        const users = await prisma.user.findMany({
            where,
            select: {
                id: true, username: true, email: true, isAdmin: true, createdAt: true,
                organizationMembers: {
                    include: { organization: { include: { subscriptions: { include: { plan: true } } } } }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(users);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const getAIJobs = async (req: Request, res: Response) => {
    try {
        const { status, userId } = req.query;

        const where: any = {};
        if (status) where.status = status;
        if (userId) where.userId = Number(userId);

        const jobs = await prisma.aIGenerationJob.findMany({
            where,
            include: { user: { select: { username: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(jobs);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const getAIConfig = async (req: Request, res: Response) => {
    try {
        const config = await prisma.aIModelConfig.findMany();
        res.json(config);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const updateAIConfig = async (req: Request, res: Response) => {
    try {
        const { featureName, modelName, isActive } = req.body;
        const config = await prisma.aIModelConfig.upsert({
            where: { featureName },
            update: { modelName: modelName || 'gemini-2.5-flash', isActive },
            create: { featureName, modelName: modelName || 'gemini-2.5-flash', isActive }
        });
        res.json(config);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

export const getAIConfigOptions = async (req: Request, res: Response) => {
    try {
        const { AI_FEATURES, GEMINI_MODELS } = await import('../types/ai.js');
        res.json({
            features: AI_FEATURES,
            models: GEMINI_MODELS
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};
