import express from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController";
import { authenticateToken } from "../middleware/authMiddleware";

const router = express.Router();

router.use(authenticateToken); // Protect all notification routes

router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);

export default router;
