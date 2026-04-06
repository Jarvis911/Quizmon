import { Request, Response } from 'express';
import prisma from '../prismaClient.js';

// ─── Public Endpoints ────────────────────────────────────────────────

/**
 * GET /promotions/active
 * Returns all published & non-expired promotions (for banner display).
 */
export const getActivePromotions = async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();
        const promotions = await prisma.promotion.findMany({
            where: {
                isPublished: true,
                isActive: true,
                expiresAt: { gt: now },
            },
            include: {
                plan: { select: { id: true, type: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(promotions);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

// ─── Admin Endpoints ─────────────────────────────────────────────────

/**
 * GET /admin/promotions
 * Returns all promotions (admin only).
 */
export const getAllPromotions = async (_req: Request, res: Response): Promise<void> => {
    try {
        const promotions = await prisma.promotion.findMany({
            include: {
                plan: { select: { id: true, type: true, name: true, priceMonthly: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.json(promotions);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

/**
 * POST /admin/promotions
 * Create a new promotion.
 */
export const createPromotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            title,
            subtitle,
            description,
            planId,
            discountedPriceMonthly,
            discountedPriceYearly,
            expiresAt,
            isPublished,
            bannerColor,
            badgeText,
        } = req.body;

        if (!title || !planId || !expiresAt) {
            res.status(400).json({ message: 'title, planId, and expiresAt are required' });
            return;
        }

        const plan = await prisma.plan.findUnique({ where: { id: Number(planId) } });
        if (!plan) {
            res.status(404).json({ message: 'Plan not found' });
            return;
        }

        const promotion = await prisma.promotion.create({
            data: {
                title,
                subtitle: subtitle || null,
                description: description || null,
                planId: Number(planId),
                discountedPriceMonthly: discountedPriceMonthly ?? 0,
                discountedPriceYearly: discountedPriceYearly ?? 0,
                expiresAt: new Date(expiresAt),
                isPublished: isPublished ?? false,
                isActive: true,
                bannerColor: bannerColor || '#0078D4',
                badgeText: badgeText || 'KHUYẾN MÃI',
            },
            include: { plan: { select: { id: true, type: true, name: true } } },
        });

        res.status(201).json(promotion);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

/**
 * PUT /admin/promotions/:id
 * Update a promotion.
 */
export const updatePromotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const {
            title,
            subtitle,
            description,
            planId,
            discountedPriceMonthly,
            discountedPriceYearly,
            expiresAt,
            isPublished,
            isActive,
            bannerColor,
            badgeText,
        } = req.body;

        const promotion = await prisma.promotion.update({
            where: { id },
            data: {
                ...(title !== undefined && { title }),
                ...(subtitle !== undefined && { subtitle }),
                ...(description !== undefined && { description }),
                ...(planId !== undefined && { planId: Number(planId) }),
                ...(discountedPriceMonthly !== undefined && { discountedPriceMonthly }),
                ...(discountedPriceYearly !== undefined && { discountedPriceYearly }),
                ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
                ...(isPublished !== undefined && { isPublished }),
                ...(isActive !== undefined && { isActive }),
                ...(bannerColor !== undefined && { bannerColor }),
                ...(badgeText !== undefined && { badgeText }),
            },
            include: { plan: { select: { id: true, type: true, name: true } } },
        });

        res.json(promotion);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

/**
 * DELETE /admin/promotions/:id
 * Delete a promotion.
 */
export const deletePromotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        await prisma.promotion.delete({ where: { id } });
        res.json({ message: 'Promotion deleted successfully' });
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};

/**
 * PUT /admin/promotions/:id/publish
 * Toggle publish status for a promotion.
 */
export const togglePublishPromotion = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = Number(req.params.id);
        const { isPublished } = req.body as { isPublished: boolean };

        const promotion = await prisma.promotion.update({
            where: { id },
            data: { isPublished },
            include: { plan: { select: { id: true, type: true, name: true } } },
        });

        res.json(promotion);
    } catch (e: any) {
        res.status(500).json({ message: e.message });
    }
};
