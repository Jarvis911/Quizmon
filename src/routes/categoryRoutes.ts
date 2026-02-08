import { Router } from 'express';
import { createCategory, getCategory, getQuizByCate } from '../controllers/categoryController.js';

const router: Router = Router();

router.post('/', createCategory);
router.get('/', getCategory);
router.get('/:id/quiz', getQuizByCate);

export default router;
