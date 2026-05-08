import { BillingCycle } from '@prisma/client';
/** Minimal escaping for interpolating user/org text into HTML emails. */
export declare function escapeHtml(text: string): string;
interface EnterpriseLayoutOptions {
    title: string;
    /** Shown in preview pane / hidden preheader */
    preheader?: string;
    /** Inner HTML (already safe or escaped as needed) */
    innerHtml: string;
    ctaLabel?: string;
    ctaUrl?: string;
    footnote?: string;
}
/**
 * Table-based HTML suitable for major email clients (limited CSS).
 */
export declare function enterpriseEmailLayout(opts: EnterpriseLayoutOptions): string;
export declare function passwordChangedEmail(params: {
    displayName: string;
    changedAt: Date;
}): {
    subject: string;
    html: string;
};
export declare function subscriptionActivatedEmail(params: {
    orgName: string;
    planName: string;
    billingCycle: BillingCycle;
    currentPeriodEnd: Date;
}): {
    subject: string;
    html: string;
};
export declare function subscriptionCanceledEmail(params: {
    orgName: string;
    planName: string;
    accessUntil: Date;
}): {
    subject: string;
    html: string;
};
export declare function homeworkAssignedEmail(params: {
    studentName: string;
    quizTitle: string;
    /** Absolute URL to the classroom or lesson */
    classroomUrl: string;
}): {
    subject: string;
    html: string;
};
export {};
