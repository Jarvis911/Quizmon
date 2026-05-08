/**
 * Service to handle notification creation and management.
 */
export declare const notificationService: {
    /**
     * Create a single notification for a user.
     * @param userId ID of the user to notify
     * @param message Notification message
     * @param type Type of notification (e.g., 'QUIZ_CREATED', 'CLASSROOM_JOINED')
     * @param link Optional link to redirect when clicked
     */
    createNotification(userId: number, message: string, type: string, link?: string): Promise<{
        id: number;
        createdAt: Date;
        userId: number;
        type: string;
        link: string | null;
        message: string;
        isRead: boolean;
    } | null>;
    /**
     * Bulk create notifications for multiple users.
     * @param notifications Array of notification objects
     */
    createBulkNotifications(notifications: {
        userId: number;
        message: string;
        type: string;
        link?: string;
    }[]): Promise<import("@prisma/client").Prisma.BatchPayload | null>;
};
