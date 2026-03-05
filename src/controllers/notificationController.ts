import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id; // Assuming auth middleware attaches `user`

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const notifications = await prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: 50, // Get the latest 50 notifications
        });

        res.status(200).json(notifications);
    } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        const notificationId = parseInt(req.params.id);

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        const notification = await prisma.notification.findUnique({
            where: { id: notificationId },
        });

        if (!notification || notification.userId !== userId) {
            res.status(404).json({ message: "Notification not found or unauthorized" });
            return;
        }

        await prisma.notification.update({
            where: { id: notificationId },
            data: { isRead: true },
        });

        res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(500).json({ message: "Server error" });
    }
};

export const markAllAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            res.status(401).json({ message: "Unauthorized" });
            return;
        }

        await prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });

        res.status(200).json({ message: "All notifications marked as read" });
    } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Server error" });
    }
};
