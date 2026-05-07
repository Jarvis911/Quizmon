import nodemailer from "nodemailer";
class EmailService {
    transporter = null;
    getTransporter() {
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_APP_PASSWORD;
        if (!user || !pass)
            return null;
        if (!this.transporter) {
            this.transporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE || "gmail",
                auth: { user, pass },
            });
        }
        return this.transporter;
    }
    async sendEmail(to, subject, html) {
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
        }
        catch (error) {
            console.error("Error sending email: ", error);
            return false;
        }
    }
}
export const emailService = new EmailService();
