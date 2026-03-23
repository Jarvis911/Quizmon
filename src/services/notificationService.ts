import prisma from '../prismaClient.js';

/**
 * Service to handle notification creation and management.
 */
export const notificationService = {
    /**
     * Create a single notification for a user.
     * @param userId ID of the user to notify
     * @param message Notification message
     * @param type Type of notification (e.g., 'QUIZ_CREATED', 'CLASSROOM_JOINED')
     * @param link Optional link to redirect when clicked
     */
    async createNotification(userId: number, message: string, type: string, link?: string) {
        try {
            return await prisma.notification.create({
                data: {
                    userId,
                    message,
                    type,
                    link,
                },
            });
        } catch (error) {
            console.error('[NotificationService Error]: Failed to create notification', error);
            // We don't throw here to avoid breaking the main flow of the controller
            return null;
        }
    },

    /**
     * Bulk create notifications for multiple users.
     * @param notifications Array of notification objects
     */
    async createBulkNotifications(notifications: { userId: number, message: string, type: string, link?: string }[]) {
        try {
            if (notifications.length === 0) return { count: 0 };
            return await prisma.notification.createMany({
                data: notifications,
            });
        } catch (error) {
            console.error('[NotificationService Error]: Failed to create bulk notifications', error);
            return null;
        }
    }
};
