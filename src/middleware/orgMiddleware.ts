import { RequestHandler } from 'express';
import prisma from '../prismaClient.js';

/**
 * Middleware to resolve the user's organization context.
 *
 * Resolution order:
 * 1. `x-organization-id` header (validates user membership)
 * 2. User's default (first) organization
 *
 * Sets `req.organizationId` on the request.
 * Returns 403 if the user doesn't belong to the specified org.
 * Continues silently if no org is found (optional org context).
 */
const orgMiddleware: RequestHandler = async (req, res, next) => {
    try {
        const userId = req.userId;
        if (!userId) {
            next();
            return;
        }

        const headerOrgId = req.headers['x-organization-id'];

        if (headerOrgId) {
            const orgId = Number(headerOrgId);
            if (isNaN(orgId)) {
                res.status(400).json({ message: 'Invalid organization ID' });
                return;
            }

            // Validate user belongs to this org
            const membership = await prisma.organizationMember.findUnique({
                where: {
                    organizationId_userId: {
                        organizationId: orgId,
                        userId: Number(userId),
                    },
                },
            });

            if (!membership) {
                res.status(403).json({ message: 'You do not belong to this organization' });
                return;
            }

            req.organizationId = orgId;
            next();
            return;
        }

        // Fall back to user's default (first) organization
        const defaultMembership = await prisma.organizationMember.findFirst({
            where: { userId: Number(userId) },
            orderBy: { joinedAt: 'asc' },
        });

        if (defaultMembership) {
            req.organizationId = defaultMembership.organizationId;
        }

        next();
    } catch (err) {
        console.error('[orgMiddleware Error]:', err);
        next(err);
    }
};

export default orgMiddleware;
