import { Request, Response } from 'express';
import { OrganizationRole } from '@prisma/client';
import prisma from '../prismaClient.js';
import {
    createOrganization,
    getOrganizations,
    getOrganizationById,
    updateOrganization,
    addMember,
    removeMember,
    updateMemberRole,
    getMemberRole,
    findUserByEmail,
    searchUsers,
} from '../services/organizationService.js';
import { getOrgFeatures as getOrgFeaturesService } from '../services/featureGateService.js';
import { getUsage } from '../services/usageService.js';

// ——— Authorization helper ———

const requireOrgAdmin = async (orgId: number, userId: number): Promise<boolean> => {
    const role = await getMemberRole(orgId, userId);
    return role === OrganizationRole.OWNER || role === OrganizationRole.ADMIN;
};

// ——— Handlers ———

export const createOrg = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name } = req.body as { name: string };
        const userId = req.userId;

        if (!name?.trim()) {
            res.status(400).json({ message: 'Organization name is required' });
            return;
        }

        const org = await createOrganization(name.trim(), Number(userId));
        res.status(201).json(org);
    } catch (err) {
        console.error('[createOrg Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

export const getOrgs = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = Number(req.userId);
        let orgs = await getOrganizations(userId);

        if (orgs.length === 0) {
            // Auto-create personal organization for users who don't have one (legacy users)
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (user) {
                const orgName = user.username ? `${user.username}'s Org` : "Personal Organization";
                await createOrganization(orgName, userId);
                orgs = await getOrganizations(userId);
            }
        }

        res.status(200).json(orgs);
    } catch (err) {
        console.error('[getOrgs Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

export const getOrg = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const org = await getOrganizationById(Number(id));

        if (!org) {
            res.status(404).json({ message: 'Organization not found' });
            return;
        }

        // Verify user belongs to this org
        const isMember = org.members.some((m) => m.userId === Number(req.userId));
        if (!isMember) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        res.status(200).json(org);
    } catch (err) {
        console.error('[getOrg Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

export const updateOrg = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { name, logoUrl } = req.body as { name?: string; logoUrl?: string };
        const userId = req.userId;

        const isAdmin = await requireOrgAdmin(Number(id), Number(userId));
        if (!isAdmin) {
            res.status(403).json({ message: 'Only owners and admins can update the organization' });
            return;
        }

        const org = await updateOrganization(Number(id), { name, logoUrl });
        res.status(200).json(org);
    } catch (err) {
        console.error('[updateOrg Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

export const addOrgMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { userId: bodyUserId, email, role } = req.body as {
            userId?: number;
            email?: string;
            role?: OrganizationRole;
        };

        const isAdmin = await requireOrgAdmin(Number(id), Number(req.userId));
        if (!isAdmin) {
            res.status(403).json({ message: 'Only owners and admins can add members' });
            return;
        }

        let targetUserId = bodyUserId;

        // If email or username is provided, find the user
        if (!targetUserId && email) {
            let user = await findUserByEmail(email);
            if (!user) {
                user = await prisma.user.findFirst({
                    where: { username: email },
                    select: { id: true, username: true, email: true },
                });
            }
            if (!user) {
                res.status(404).json({ message: 'User with this email or username not found' });
                return;
            }
            targetUserId = user.id;
        }

        if (!targetUserId) {
            res.status(400).json({ message: 'User ID or email is required' });
            return;
        }

        const member = await addMember(Number(id), Number(targetUserId), role);
        res.status(201).json(member);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('Unique constraint')) {
            res.status(409).json({ message: 'User is already a member of this organization' });
            return;
        }
        console.error('[addOrgMember Error]:', err);
        res.status(500).json({ message });
    }
};

export const removeOrgMember = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, userId: targetUserId } = req.params;

        const isAdmin = await requireOrgAdmin(Number(id), Number(req.userId));
        if (!isAdmin) {
            res.status(403).json({ message: 'Only owners and admins can remove members' });
            return;
        }

        await removeMember(Number(id), Number(targetUserId));
        res.status(200).json({ message: 'Member removed successfully' });
    } catch (err) {
        const message = (err as Error).message;
        if (message.includes('last owner')) {
            res.status(400).json({ message });
            return;
        }
        console.error('[removeOrgMember Error]:', err);
        res.status(500).json({ message });
    }
};

export const updateOrgMemberRole = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, userId: targetUserId } = req.params;
        const { role } = req.body as { role: OrganizationRole };

        const isAdmin = await requireOrgAdmin(Number(id), Number(req.userId));
        if (!isAdmin) {
            res.status(403).json({ message: 'Only owners and admins can change member roles' });
            return;
        }

        const member = await updateMemberRole(Number(id), Number(targetUserId), role);
        res.status(200).json(member);
    } catch (err) {
        const message = (err as Error).message;
        if (message.includes('last owner')) {
            res.status(400).json({ message });
            return;
        }
        console.error('[updateOrgMemberRole Error]:', err);
        res.status(500).json({ message });
    }
};

export const searchOrgUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { query } = req.query as { query?: string };
        if (!query || query.length < 2) {
            res.status(200).json([]);
            return;
        }

        const users = await searchUsers(query);
        res.status(200).json(users);
    } catch (err) {
        console.error('[searchOrgUsers Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};

export const getOrgFeatures = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const orgId = Number(id);

        // Verify user belongs to this org
        const role = await getMemberRole(orgId, Number(req.userId));
        if (!role) {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        // Fetch features (array format: { featureKey, enabled, limit })
        const featuresArray = await getOrgFeaturesService(orgId);
        
        // Fetch current usage for the period
        const usageMetrics = await getUsage(orgId);

        // Usage keys map loosely to feature keys, we can write a helper to match them,
        // or just rely on finding usages by comparing lowercase key.
        const usageMap: Record<string, number> = {};
        for (const metric of usageMetrics) {
            usageMap[metric.key] = metric.value;
        }

        // Feature key to Metric key mapping
        const featureToUsageKey: Record<string, string> = {
            'AI_GENERATION': 'ai_generations',
            'UNLIMITED_MATCHES': 'matches_hosted',
            'MAX_PLAYERS_PER_MATCH': 'max_players' // Not tracked per period, but fits the pattern
        };

        // Construct dictionary for frontend FeatureContext
        const featuresDict: Record<string, { enabled: boolean; limit: number | null; current: number }> = {};
        
        for (const feat of featuresArray) {
            const usageKey = featureToUsageKey[feat.featureKey] || feat.featureKey.toLowerCase();
            const currentUsage = usageMap[usageKey] || 0;

            featuresDict[feat.featureKey] = {
                enabled: feat.enabled,
                limit: feat.limit,
                current: currentUsage
            };
        }

        res.status(200).json(featuresDict);
    } catch (err) {
        console.error('[getOrgFeatures Error]:', err);
        res.status(500).json({ message: (err as Error).message });
    }
};
