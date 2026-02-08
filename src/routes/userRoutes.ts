import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import { getUserStats } from '../controllers/userController.js';

const router: Router = Router();

router.get('/statistics', authMiddleware, logMiddleware, getUserStats);

export default router;
