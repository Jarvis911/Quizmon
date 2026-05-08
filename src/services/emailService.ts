import nodemailer from "nodemailer";
import prisma from "../prismaClient.js";

class EmailService {
    private transporter: nodemailer.Transporter | null = null;

    private getTransporter() {
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_APP_PASSWORD;
        if (!user || !pass) return null;

        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || "gmail",
                auth: { user, pass },
            });
        }

        return this.transporter;
    }

    async sendEmail(to: string, subject: string, html: string) {
        try {
            const transporter = this.getTransporter();
            if (!transporter) {
                console.warn("Email service disabled: missing EMAIL_USER or EMAIL_APP_PASSWORD in .env");
                return false;
            }

            const mailOptions = {
                from: `"${process.env.EMAIL_FROM_NAME || "Quizmon"}" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html,
            };

            const info = await transporter.sendMail(mailOptions);
            console.log("Email sent successfully: ", info.messageId);
            return true;
        } catch (error) {
            console.error("Error sending email: ", error);
            return false;
        }
    }

    /** Send the same HTML message to organization OWNER and ADMIN members (billing/security notices). */
    async sendToOrgBillingContacts(organizationId: number, subject: string, html: string): Promise<void> {
        const members =
            (await prisma.organizationMember.findMany({
                where: {
                    organizationId,
                    role: { in: ["OWNER", "ADMIN"] },
                },
                include: { user: { select: { email: true } } },
            })) ?? [];
        const emails = [...new Set(members.map((m) => m.user.email).filter(Boolean))] as string[];
        if (emails.length === 0) return;
        await Promise.all(emails.map((to) => this.sendEmail(to, subject, html)));
    }
}

export const emailService = new EmailService();
