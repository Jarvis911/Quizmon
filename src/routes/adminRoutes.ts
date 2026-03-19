import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import * as adminController from '../controllers/adminController.js';

const router: Router = Router();

// Apply auth and admin middleware to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', adminController.getDashboardStats);
router.get('/users', adminController.getUsers);
router.get('/quizzes', adminController.getQuizzes);
router.delete('/quizzes/:id', adminController.deleteQuiz);
router.get('/reports', adminController.getReports);
router.put('/reports/:id/resolve', adminController.resolveReport);
router.get('/ai-jobs', adminController.getAIJobs);
router.get('/ai-config', adminController.getAIConfig);
router.put('/ai-config', adminController.updateAIConfig);

export default router;
