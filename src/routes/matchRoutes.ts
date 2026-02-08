import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import { createMatch, getMatch, updateMatch } from '../controllers/matchController.js';

const router: Router = Router();

router.post('/', authMiddleware, logMiddleware, createMatch);
router.get('/:id', getMatch);
router.put('/:id', updateMatch);

export default router;
