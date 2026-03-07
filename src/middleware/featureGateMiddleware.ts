import { RequestHandler } from 'express';
import { FeatureKey } from '@prisma/client';
import { canUseFeature } from '../services/featureGateService.js';

/**
 * Middleware factory that gates access based on a plan feature.
 * Returns 403 if the org cannot use the feature, or if no org context exists.
 *
 * Usage:
 *   router.post('/ai/generate', authMiddleware, orgMiddleware, requireFeature('AI_GENERATION'), handler);
 */
const requireFeature = (featureKey: FeatureKey): RequestHandler => {
    return async (req, res, next) => {
        try {
            const orgId = req.organizationId;
            if (!orgId) {
                res.status(403).json({
                    message: 'Organization context required to access this feature',
                });
                return;
            }

            const status = await canUseFeature(orgId, featureKey);

            if (!status.allowed) {
                res.status(403).json({
                    message: `Feature "${featureKey}" is not available on your current plan`,
                    featureKey,
                    enabled: status.enabled,
                    limit: status.limit,
                });
                return;
            }

            next();
        } catch (err) {
            console.error('[featureGateMiddleware Error]:', err);
            next(err);
        }
    };
};

export default requireFeature;
