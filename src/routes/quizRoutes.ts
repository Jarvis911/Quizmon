import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { getQuiz, createQuiz, getRetrieveQuiz, getQuestionByQuiz, checkUserRateQuiz, getQuizRating } from '../controllers/quizController.js';

const router: Router = Router();

router.post('/', authMiddleware, upload.single('file'), createQuiz);
router.get('/', authMiddleware, getQuiz);
router.get('/:id/question', getQuestionByQuiz);
router.get('/:id', getRetrieveQuiz);
router.get('/:id/rated', authMiddleware, checkUserRateQuiz);
router.get('/:id/rating', getQuizRating);

export default router;
