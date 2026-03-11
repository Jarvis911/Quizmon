import { OrganizationRole } from '@prisma/client';
/**
 * Generate a URL-friendly slug from a name. Appends a random suffix to ensure uniqueness.
 */
export declare const generateSlug: (name: string) => string;
/**
 * Create an organization, add the creator as OWNER,
 * and auto-assign the FREE plan subscription if available.
 */
export declare const createOrganization: (name: string, userId: number) => Promise<{
    members: ({
        user: {
            id: number;
            username: string | null;
            email: string;
        };
    } & {
        id: number;
        organizationId: number;
        userId: number;
        role: import("@prisma/client").$Enums.OrganizationRole;
        joinedAt: Date;
    })[];
} & {
    name: string;
    id: number;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    logoUrl: string | null;
}>;
/**
 * List all organizations the user belongs to.
 */
export declare const getOrganizations: (userId: number) => Promise<({
    _count: {
        quizzes: number;
        classrooms: number;
        members: number;
    };
    subscriptions: ({
        plan: {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            type: import("@prisma/client").$Enums.PlanType;
            priceMonthly: number;
            priceYearly: number;
            isActive: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        organizationId: number;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        billingCycle: import("@prisma/client").$Enums.BillingCycle;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        canceledAt: Date | null;
        trialEndsAt: Date | null;
        planId: number;
    })[];
} & {
    name: string;
    id: number;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    logoUrl: string | null;
})[]>;
/**
 * Get a single organization by ID with members.
 */
export declare const getOrganizationById: (orgId: number) => Promise<({
    _count: {
        quizzes: number;
        classrooms: number;
        matches: number;
    };
    members: ({
        user: {
            id: number;
            username: string | null;
            email: string;
        };
    } & {
        id: number;
        organizationId: number;
        userId: number;
        role: import("@prisma/client").$Enums.OrganizationRole;
        joinedAt: Date;
    })[];
    subscriptions: ({
        plan: {
            features: {
                id: number;
                planId: number;
                featureKey: import("@prisma/client").$Enums.FeatureKey;
                limit: number | null;
                enabled: boolean;
            }[];
        } & {
            name: string;
            id: number;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            type: import("@prisma/client").$Enums.PlanType;
            priceMonthly: number;
            priceYearly: number;
            isActive: boolean;
        };
    } & {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        organizationId: number;
        status: import("@prisma/client").$Enums.SubscriptionStatus;
        billingCycle: import("@prisma/client").$Enums.BillingCycle;
        currentPeriodStart: Date;
        currentPeriodEnd: Date;
        canceledAt: Date | null;
        trialEndsAt: Date | null;
        planId: number;
    })[];
} & {
    name: string;
    id: number;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    logoUrl: string | null;
}) | null>;
/**
 * Update organization details (name, logoUrl).
 */
export declare const updateOrganization: (orgId: number, data: {
    name?: string;
    logoUrl?: string;
}) => Promise<{
    members: ({
        user: {
            id: number;
            username: string | null;
            email: string;
        };
    } & {
        id: number;
        organizationId: number;
        userId: number;
        role: import("@prisma/client").$Enums.OrganizationRole;
        joinedAt: Date;
    })[];
} & {
    name: string;
    id: number;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    logoUrl: string | null;
}>;
/**
 * Add a member to an organization.
 */
export declare const addMember: (orgId: number, userId: number, role?: OrganizationRole) => Promise<{
    user: {
        id: number;
        username: string | null;
        email: string;
    };
} & {
    id: number;
    organizationId: number;
    userId: number;
    role: import("@prisma/client").$Enums.OrganizationRole;
    joinedAt: Date;
}>;
/**
 * Remove a member from an organization.
 * Prevents removing the last OWNER.
 */
export declare const removeMember: (orgId: number, userId: number) => Promise<{
    id: number;
    organizationId: number;
    userId: number;
    role: import("@prisma/client").$Enums.OrganizationRole;
    joinedAt: Date;
}>;
/**
 * Update a member's role in an organization.
 * Prevents demoting the last OWNER.
 */
export declare const updateMemberRole: (orgId: number, userId: number, role: OrganizationRole) => Promise<{
    user: {
        id: number;
        username: string | null;
        email: string;
    };
} & {
    id: number;
    organizationId: number;
    userId: number;
    role: import("@prisma/client").$Enums.OrganizationRole;
    joinedAt: Date;
}>;
/**
 * Get the member role for a user in an organization.
 */
export declare const getMemberRole: (orgId: number, userId: number) => Promise<import("@prisma/client").$Enums.OrganizationRole | null>;
/**
 * Search for users by email or username (for invitations).
 */
export declare const searchUsers: (query: string) => Promise<{
    id: number;
    username: string | null;
    email: string;
}[]>;
/**
 * Find a user by email.
 */
export declare const findUserByEmail: (email: string) => Promise<{
    id: number;
    username: string | null;
    email: string;
} | null>;
