import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import {
    createButtonQuestion,
    updateButtonQuestion,
    createCheckboxQuestion,
    updateCheckboxQuestion,
    createRangeQuestion,
    updateRangeQuestion,
    createReorderQuestion,
    updateReorderQuestion,
    createLocationQuestion,
    updateLocationQuestion,
    createTypeAnswerQuestion,
    updateTypeAnswerQuestion,
    getRetrieveQuestion,
} from '../controllers/questionController.js';

const router: Router = Router();

router.post('/buttons', authMiddleware, logMiddleware, upload.array('files', 5), createButtonQuestion);
router.put('/buttons/:id', authMiddleware, upload.array('files', 5), updateButtonQuestion);

router.post('/checkboxes', authMiddleware, logMiddleware, upload.array('files', 5), createCheckboxQuestion);
router.put('/checkboxes/:id', authMiddleware, upload.array('files', 5), updateCheckboxQuestion);

router.post('/range', authMiddleware, logMiddleware, upload.array('files', 5), createRangeQuestion);
router.put('/range/:id', authMiddleware, logMiddleware, upload.array('files', 5), updateRangeQuestion);

router.post('/reorder', authMiddleware, logMiddleware, upload.array('files', 5), createReorderQuestion);
router.put('/reorder/:id', authMiddleware, logMiddleware, upload.array('files', 5), updateReorderQuestion);

router.post('/location', authMiddleware, logMiddleware, createLocationQuestion);
router.put('/location/:id', authMiddleware, logMiddleware, updateLocationQuestion);

router.post('/typeanswer', authMiddleware, logMiddleware, upload.array('files', 5), createTypeAnswerQuestion);
router.put('/typeanswer/:id', authMiddleware, logMiddleware, upload.array('files', 5), updateTypeAnswerQuestion);

router.get('/:id', getRetrieveQuestion);

export default router;
