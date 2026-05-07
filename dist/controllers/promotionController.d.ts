import { Request, Response } from 'express';
/**
 * GET /promotions/active
 * Returns all published & non-expired promotions (for banner display).
 */
export declare const getActivePromotions: (_req: Request, res: Response) => Promise<void>;
/**
 * GET /admin/promotions
 * Returns all promotions (admin only).
 */
export declare const getAllPromotions: (_req: Request, res: Response) => Promise<void>;
/**
 * POST /admin/promotions
 * Create a new promotion.
 */
export declare const createPromotion: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /admin/promotions/:id
 * Update a promotion.
 */
export declare const updatePromotion: (req: Request, res: Response) => Promise<void>;
/**
 * DELETE /admin/promotions/:id
 * Delete a promotion.
 */
export declare const deletePromotion: (req: Request, res: Response) => Promise<void>;
/**
 * PUT /admin/promotions/:id/publish
 * Toggle publish status for a promotion.
 */
export declare const togglePublishPromotion: (req: Request, res: Response) => Promise<void>;
