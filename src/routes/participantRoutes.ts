import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import {
    createParticipant,
    getParticipants,
    getParticipant,
    updateParticipant,
    deleteParticipant,
} from '../controllers/participantController.js';

const router: Router = Router();

// Participant routes (nested under /match/:matchId)
router.post('/:matchId/participants', authMiddleware, createParticipant);
router.get('/:matchId/participants', getParticipants);
router.get('/:matchId/participants/:id', getParticipant);
router.put('/:matchId/participants/:id', authMiddleware, updateParticipant);
router.delete('/:matchId/participants/:id', authMiddleware, deleteParticipant);

export default router;
