import { RequestHandler } from 'express';
import { FeatureKey } from '@prisma/client';
/**
 * Middleware factory that gates access based on a plan feature.
 * Returns 403 if the org cannot use the feature, or if no org context exists.
 *
 * Usage:
 *   router.post('/ai/generate', authMiddleware, orgMiddleware, requireFeature('AI_GENERATION'), handler);
 */
declare const requireFeature: (featureKey: FeatureKey) => RequestHandler;
export default requireFeature;
