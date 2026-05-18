import { OrganizationRole, PlanType, SubscriptionStatus } from '@prisma/client';
import prisma from '../prismaClient.js';

const TEAM_COLLABORATION_PLANS: PlanType[] = [PlanType.SCHOOL, PlanType.ENTERPRISE];

/** Message for 403 when team-only org actions are blocked (Vietnamese, matches quiz copy style). */
export const TEAM_COLLABORATION_FORBIDDEN_MESSAGE =
    'Tính năng nhóm và thư viện tổ chức chỉ khả dụng với gói School hoặc Enterprise.';

export async function getActivePlanTypeForOrganization(orgId: number): Promise<PlanType | null> {
    const sub = await prisma.subscription.findFirst({
        where: { organizationId: orgId, status: SubscriptionStatus.ACTIVE },
        include: { plan: true },
        orderBy: { createdAt: 'desc' },
    });
    return sub?.plan?.type ?? null;
}

export async function organizationHasTeamCollaboration(orgId: number): Promise<boolean> {
    const planType = await getActivePlanTypeForOrganization(orgId);
    return planType !== null && TEAM_COLLABORATION_PLANS.includes(planType);
}

/** True iff the user is OWNER or ADMIN of at least one org on School or Enterprise. */
export async function userCanCreateAdditionalOrganization(userId: number): Promise<boolean> {
    const memberships = await prisma.organizationMember.findMany({
        where: {
            userId,
            role: { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN] },
        },
        select: { organizationId: true },
    });
    for (const m of memberships) {
        if (await organizationHasTeamCollaboration(m.organizationId)) return true;
    }
    return false;
}
