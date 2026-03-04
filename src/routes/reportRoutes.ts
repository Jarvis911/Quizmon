import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { generateExcelReport } from '../controllers/reportController.js';

const router: Router = Router();

// Apply auth middleware
router.use(authMiddleware);

router.get('/excel/:matchId', generateExcelReport);

export default router;
