import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    createAnswer,
    getMatchAnswers,
    getParticipantAnswers,
} from '../controllers/answerController.js';

const router: Router = Router();

// Answer routes (nested under /match/:matchId)
router.post('/:matchId/answers', authMiddleware, createAnswer);
router.get('/:matchId/answers', authMiddleware, getMatchAnswers);
router.get('/:matchId/participants/:participantId/answers', authMiddleware, getParticipantAnswers);

export default router;
