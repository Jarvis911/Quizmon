import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import adminMiddleware from '../middleware/adminMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import * as promotionController from '../controllers/promotionController.js';

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
router.get('/ai-config-options', adminController.getAIConfigOptions);
router.put('/ai-config', adminController.updateAIConfig);

// Promotion management
router.get('/promotions', promotionController.getAllPromotions);
router.post('/promotions', promotionController.createPromotion);
router.put('/promotions/:id', promotionController.updatePromotion);
router.delete('/promotions/:id', promotionController.deletePromotion);
router.put('/promotions/:id/publish', promotionController.togglePublishPromotion);

export default router;
