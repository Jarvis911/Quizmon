import nodemailer from "nodemailer";
class EmailService {
    transporter;
    constructor() {
        // You should configure these in your .env file
        this.transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD,
            },
        });
    }
    async sendEmail(to, subject, html) {
        try {
            if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
                console.warn("⚠️ Email service is disabled. Missing EMAIL_USER or EMAIL_APP_PASSWORD in .env");
                return false;
            }
            const mailOptions = {
                from: `"Quizmon" <${process.env.EMAIL_USER}>`,
                to,
                subject,
                html,
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log("Email sent successfully: ", info.messageId);
            return true;
        }
        catch (error) {
            console.error("Error sending email: ", error);
            return false;
        }
    }
}
export const emailService = new EmailService();
