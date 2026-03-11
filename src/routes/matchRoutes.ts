import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import orgMiddleware from '../middleware/orgMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import { createMatch, getMatch, updateMatch, deleteMatch } from '../controllers/matchController.js';

const router: Router = Router();

router.post('/', authMiddleware, orgMiddleware, logMiddleware, createMatch);
router.get('/:id', getMatch);
router.put('/:id', authMiddleware, orgMiddleware, updateMatch);
router.delete('/:id', authMiddleware, orgMiddleware, deleteMatch);

export default router;
