import prisma from '../prismaClient.js';
import { OrganizationRole, SubscriptionStatus, BillingCycle } from '@prisma/client';
/**
 * Generate a URL-friendly slug from a name. Appends a random suffix to ensure uniqueness.
 */
export const generateSlug = (name) => {
    const base = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    const suffix = Math.random().toString(36).substring(2, 6);
    return `${base}-${suffix}`;
};
/**
 * Create an organization, add the creator as OWNER,
 * and auto-assign the FREE plan subscription if available.
 */
export const createOrganization = async (name, userId) => {
    const slug = generateSlug(name);
    const organization = await prisma.organization.create({
        data: {
            name,
            slug,
            members: {
                create: {
                    userId,
                    role: OrganizationRole.OWNER,
                },
            },
        },
        include: {
            members: {
                include: {
                    user: { select: { id: true, username: true, email: true } },
                },
            },
        },
    });
    // Auto-create FREE subscription for the new org
    try {
        const freePlan = await prisma.plan.findUnique({
            where: { type: 'FREE' },
        });
        if (freePlan) {
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setFullYear(periodEnd.getFullYear() + 100); // FREE plan = effectively no expiration
            await prisma.subscription.create({
                data: {
                    organizationId: organization.id,
                    planId: freePlan.id,
                    status: SubscriptionStatus.ACTIVE,
                    billingCycle: BillingCycle.MONTHLY,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                },
            });
        }
    }
    catch (err) {
        // Non-critical: log but don't fail org creation
        console.warn('[createOrganization] Failed to auto-create FREE subscription:', err);
    }
    return organization;
};
/**
 * List all organizations the user belongs to.
 */
export const getOrganizations = async (userId) => {
    return prisma.organization.findMany({
        where: {
            members: { some: { userId } },
        },
        include: {
            _count: { select: { members: true, quizzes: true, classrooms: true } },
            subscriptions: {
                where: { status: 'ACTIVE' },
                include: { plan: true },
                take: 1,
            },
        },
        orderBy: { createdAt: 'asc' },
    });
};
/**
 * Get a single organization by ID with members.
 */
export const getOrganizationById = async (orgId) => {
    return prisma.organization.findUnique({
        where: { id: orgId },
        include: {
            members: {
                include: {
                    user: { select: { id: true, username: true, email: true } },
                },
                orderBy: { joinedAt: 'asc' },
            },
            subscriptions: {
                where: { status: 'ACTIVE' },
                include: { plan: { include: { features: true } } },
                take: 1,
            },
            _count: { select: { quizzes: true, classrooms: true, matches: true } },
        },
    });
};
/**
 * Update organization details (name, logoUrl).
 */
export const updateOrganization = async (orgId, data) => {
    const updateData = { ...data };
    if (data.name) {
        updateData.slug = generateSlug(data.name);
    }
    return prisma.organization.update({
        where: { id: orgId },
        data: updateData,
        include: {
            members: {
                include: {
                    user: { select: { id: true, username: true, email: true } },
                },
            },
        },
    });
};
/**
 * Add a member to an organization.
 */
export const addMember = async (orgId, userId, role = OrganizationRole.MEMBER) => {
    return prisma.organizationMember.create({
        data: {
            organizationId: orgId,
            userId,
            role,
        },
        include: {
            user: { select: { id: true, username: true, email: true } },
        },
    });
};
/**
 * Remove a member from an organization.
 * Prevents removing the last OWNER.
 */
export const removeMember = async (orgId, userId) => {
    // Check if user is the last owner
    const member = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!member) {
        throw new Error('Member not found');
    }
    if (member.role === OrganizationRole.OWNER) {
        const ownerCount = await prisma.organizationMember.count({
            where: { organizationId: orgId, role: OrganizationRole.OWNER },
        });
        if (ownerCount <= 1) {
            throw new Error('Cannot remove the last owner of the organization');
        }
    }
    return prisma.organizationMember.delete({
        where: { organizationId_userId: { organizationId: orgId, userId } },
    });
};
/**
 * Update a member's role in an organization.
 * Prevents demoting the last OWNER.
 */
export const updateMemberRole = async (orgId, userId, role) => {
    const currentMember = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    if (!currentMember) {
        throw new Error('Member not found');
    }
    // Prevent demoting the last OWNER
    if (currentMember.role === OrganizationRole.OWNER && role !== OrganizationRole.OWNER) {
        const ownerCount = await prisma.organizationMember.count({
            where: { organizationId: orgId, role: OrganizationRole.OWNER },
        });
        if (ownerCount <= 1) {
            throw new Error('Cannot demote the last owner of the organization');
        }
    }
    return prisma.organizationMember.update({
        where: { organizationId_userId: { organizationId: orgId, userId } },
        data: { role },
        include: {
            user: { select: { id: true, username: true, email: true } },
        },
    });
};
/**
 * Get the member role for a user in an organization.
 */
export const getMemberRole = async (orgId, userId) => {
    const member = await prisma.organizationMember.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } },
    });
    return member?.role ?? null;
};
/**
 * Search for users by email or username (for invitations).
 */
export const searchUsers = async (query) => {
    return prisma.user.findMany({
        where: {
            OR: [
                { email: { contains: query, mode: 'insensitive' } },
                { username: { contains: query, mode: 'insensitive' } },
            ],
        },
        select: {
            id: true,
            username: true,
            email: true,
        },
        take: 10,
    });
};
/**
 * Find a user by email.
 */
export const findUserByEmail = async (email) => {
    return prisma.user.findUnique({
        where: { email },
        select: { id: true, username: true, email: true },
    });
};
