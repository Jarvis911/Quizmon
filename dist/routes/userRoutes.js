import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { getUserStats, updateProfile, uploadAvatar, } from '../controllers/userController.js';
const router = Router();
// ... (existing swagger docs)
router.get('/statistics', authMiddleware, logMiddleware, getUserStats);
// ... (existing swagger docs)
router.put('/profile', authMiddleware, logMiddleware, updateProfile);
/**
 * @swagger
 * /user/avatar/upload:
 *   post:
 *     summary: Upload user avatar
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar uploaded successfully
 */
router.post('/avatar/upload', authMiddleware, logMiddleware, upload.single('avatar'), uploadAvatar);
export default router;
