declare class EmailService {
    private transporter;
    constructor();
    sendEmail(to: string, subject: string, html: string): Promise<boolean>;
}
export declare const emailService: EmailService;
export {};
