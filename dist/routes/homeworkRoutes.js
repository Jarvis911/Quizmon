import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createHomeworkMatch, finishHomework, startHomework, submitHomeworkAnswer } from '../controllers/homeworkController.js';
const router = Router();
// Apply auth middleware to all homework routes
router.use(authMiddleware);
router.post('/', createHomeworkMatch);
router.post('/:id/start', startHomework);
router.post('/:id/answer', submitHomeworkAnswer);
router.post('/:id/finish', finishHomework);
export default router;
