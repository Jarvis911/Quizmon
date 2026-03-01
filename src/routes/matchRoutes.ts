import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import { createMatch, getMatch, updateMatch, deleteMatch } from '../controllers/matchController.js';

const router: Router = Router();

router.post('/', authMiddleware, logMiddleware, createMatch);
router.get('/:id', getMatch);
router.put('/:id', authMiddleware, updateMatch);
router.delete('/:id', authMiddleware, deleteMatch);

export default router;
