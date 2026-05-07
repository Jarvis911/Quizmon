import express from "express";
import { getNotifications, markAsRead, markAllAsRead } from "../controllers/notificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
const router = express.Router();
router.use(authMiddleware); // Protect all notification routes
router.get("/", getNotifications);
router.put("/read-all", markAllAsRead);
router.put("/:id/read", markAsRead);
export default router;
