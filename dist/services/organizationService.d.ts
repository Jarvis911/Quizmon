import { OrganizationRole } from '@prisma/client';
/**
 * Generate a URL-friendly slug from a name. Appends a random suffix to ensure uniqueness.
 */
export declare const generateSlug: (name: string) => string;
/**
 * Create an organization, add the creator as OWNER,
 * and auto-assign the FREE plan subscription if available.
 */
export declare const createOrganization: (name: string, userId: number) => Promise<any>;
/**
 * List all organizations the user belongs to.
 */
export declare const getOrganizations: (userId: number) => Promise<any>;
/**
 * Get a single organization by ID with members.
 */
export declare const getOrganizationById: (orgId: number) => Promise<any>;
/**
 * Update organization details (name, logoUrl).
 */
export declare const updateOrganization: (orgId: number, data: {
    name?: string;
    logoUrl?: string;
}) => Promise<any>;
/**
 * Add a member to an organization.
 */
export declare const addMember: (orgId: number, userId: number, role?: OrganizationRole) => Promise<any>;
/**
 * Remove a member from an organization.
 * Prevents removing the last OWNER.
 */
export declare const removeMember: (orgId: number, userId: number) => Promise<any>;
/**
 * Update a member's role in an organization.
 * Prevents demoting the last OWNER.
 */
export declare const updateMemberRole: (orgId: number, userId: number, role: OrganizationRole) => Promise<any>;
/**
 * Get the member role for a user in an organization.
 */
export declare const getMemberRole: (orgId: number, userId: number) => Promise<any>;
/**
 * Search for users by email or username (for invitations).
 */
export declare const searchUsers: (query: string) => Promise<any>;
/**
 * Find a user by email.
 */
export declare const findUserByEmail: (email: string) => Promise<any>;
