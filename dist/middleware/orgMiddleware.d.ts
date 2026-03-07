import { RequestHandler } from 'express';
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
declare const orgMiddleware: RequestHandler;
export default orgMiddleware;
