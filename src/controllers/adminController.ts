import { Request, Response } from 'express';
import { FeatureKey } from '@prisma/client';
import prisma from '../prismaClient.js';
import { deleteQuizCascade } from '../services/deleteQuizCascade.js';
import { AI_FEATURES, GEMINI_MODELS } from '../types/ai.js';

const ALL_FEATURE_KEYS = Object.values(FeatureKey) as FeatureKey[];

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
        await deleteQuizCascade(id);
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
        res.json({
            features: ['QUIZ_GENERATION', 'QUESTION_REGENERATION', 'AGENT_CHAT', 'IMAGE_GENERATION', 'STUDENT_LIST_OCR'],
            models: [
                'gemini-2.5-flash',
                'gemini-2.5-flash-image',
                'gemini-2.5-flash-lite',
                'gemini-2.0-flash',
                'gemini-2.0-flash-lite',
                'gemini-2.0-flash-preview-image-generation',
                'gemini-1.5-flash',
                'gemini-1.5-pro',
            ],
        });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

/** GET /admin/plans/keys — enum values for subscription plan features (for admin UI). */
export const getPlanFeatureKeys = async (_req: Request, res: Response) => {
    try {
        res.json({ keys: ALL_FEATURE_KEYS });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

/** GET /admin/plans — all plans including inactive, with features. */
export const getAdminPlans = async (_req: Request, res: Response) => {
    try {
        const plans = await prisma.plan.findMany({
            include: { features: true },
            orderBy: { priceMonthly: 'asc' },
        });
        res.json(plans);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

/** PUT /admin/plans/:id — update display/pricing/active flag (`type` is fixed per row). */
export const updatePlan = async (req: Request, res: Response) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            res.status(400).json({ message: 'Invalid plan id' });
            return;
        }

        const { name, description, priceMonthly, priceYearly, isActive } = req.body as {
            name?: string;
            description?: string | null;
            priceMonthly?: number;
            priceYearly?: number;
            isActive?: boolean;
        };

        const existing = await prisma.plan.findUnique({ where: { id } });
        if (!existing) {
            res.status(404).json({ message: 'Plan not found' });
            return;
        }

        const data: {
            name?: string;
            description?: string | null;
            priceMonthly?: number;
            priceYearly?: number;
            isActive?: boolean;
        } = {};

        if (typeof name === 'string') {
            const trimmed = name.trim();
            if (!trimmed) {
                res.status(400).json({ message: 'name cannot be empty' });
                return;
            }
            data.name = trimmed;
        }
        if (description !== undefined) {
            data.description = description === null || description === '' ? null : String(description);
        }
        if (priceMonthly !== undefined) {
            const n = Number(priceMonthly);
            if (Number.isNaN(n) || n < 0) {
                res.status(400).json({ message: 'priceMonthly must be a non-negative number' });
                return;
            }
            data.priceMonthly = n;
        }
        if (priceYearly !== undefined) {
            const n = Number(priceYearly);
            if (Number.isNaN(n) || n < 0) {
                res.status(400).json({ message: 'priceYearly must be a non-negative number' });
                return;
            }
            data.priceYearly = n;
        }
        if (typeof isActive === 'boolean') {
            data.isActive = isActive;
        }

        if (Object.keys(data).length === 0) {
            res.status(400).json({ message: 'No valid fields to update' });
            return;
        }

        const updated = await prisma.plan.update({
            where: { id },
            data,
            include: { features: true },
        });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

type FeatureRowInput = { featureKey: string; limit?: number | null; enabled: boolean };

/** PUT /admin/plans/:id/features — replace all feature rows for the plan. */
export const replacePlanFeatures = async (req: Request, res: Response) => {
    try {
        const planId = Number(req.params.id);
        if (Number.isNaN(planId)) {
            res.status(400).json({ message: 'Invalid plan id' });
            return;
        }

        const plan = await prisma.plan.findUnique({ where: { id: planId } });
        if (!plan) {
            res.status(404).json({ message: 'Plan not found' });
            return;
        }

        const body = req.body as { features?: FeatureRowInput[] };
        if (!Array.isArray(body.features)) {
            res.status(400).json({ message: 'features must be an array' });
            return;
        }

        const seen = new Set<string>();
        const rows: Array<{ planId: number; featureKey: FeatureKey; limit: number | null; enabled: boolean }> = [];

        for (const row of body.features) {
            if (!row || typeof row.featureKey !== 'string') {
                res.status(400).json({ message: 'Each feature must include featureKey' });
                return;
            }
            if (!ALL_FEATURE_KEYS.includes(row.featureKey as FeatureKey)) {
                res.status(400).json({ message: `Unknown featureKey: ${row.featureKey}` });
                return;
            }
            if (seen.has(row.featureKey)) {
                res.status(400).json({ message: `Duplicate featureKey: ${row.featureKey}` });
                return;
            }
            seen.add(row.featureKey);

            let limit: number | null = null;
            if (row.limit !== undefined && row.limit !== null) {
                const n = typeof row.limit === 'number' ? row.limit : Number(row.limit);
                if (Number.isNaN(n) || n < 0) {
                    res.status(400).json({ message: `Invalid limit for ${row.featureKey}` });
                    return;
                }
                limit = n;
            }

            rows.push({
                planId,
                featureKey: row.featureKey as FeatureKey,
                limit,
                enabled: Boolean(row.enabled),
            });
        }

        await prisma.$transaction(async (tx) => {
            await tx.planFeature.deleteMany({ where: { planId } });
            if (rows.length > 0) {
                await tx.planFeature.createMany({ data: rows });
            }
        });

        const updated = await prisma.plan.findUnique({
            where: { id: planId },
            include: { features: true },
        });
        res.json(updated);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};
