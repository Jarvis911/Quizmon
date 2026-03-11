import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import orgMiddleware from '../middleware/orgMiddleware.js';
import { createClassroom, getClassroomById, getClassrooms, joinClassroom } from '../controllers/classroomController.js';

const router: Router = Router();

// Apply auth middleware to all classroom routes
router.use(authMiddleware);
router.use(orgMiddleware);

router.post('/', createClassroom);
router.get('/', getClassrooms);
router.get('/:id', getClassroomById);
router.post('/join', joinClassroom);

export default router;
