import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { postRating } from '../controllers/ratingController.js';
const router = Router();
router.post('/', authMiddleware, postRating);
export default router;
