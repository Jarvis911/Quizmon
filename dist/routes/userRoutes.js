import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import { getUserStats } from '../controllers/userController.js';
const router = Router();
/**
 * @swagger
 * /user/statistics:
 *   get:
 *     summary: Get user statistics
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics
 */
router.get('/statistics', authMiddleware, logMiddleware, getUserStats);
export default router;
