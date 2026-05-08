declare class EmailService {
    private transporter;
    private getTransporter;
    sendEmail(to: string, subject: string, html: string): Promise<boolean>;
    /** Send the same HTML message to organization OWNER and ADMIN members (billing/security notices). */
    sendToOrgBillingContacts(organizationId: number, subject: string, html: string): Promise<void>;
}
export declare const emailService: EmailService;
export {};
