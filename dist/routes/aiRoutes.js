import { Router } from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware.js';
import orgMiddleware from '../middleware/orgMiddleware.js';
import { createJob, getJobs, getJob, updateGeneratedQuestion, regenerateGeneratedQuestion, updateGeneratedQuestionContent, deleteGeneratedQuestion, approveAllAndCreateQuiz, updateJobStatus, deleteJob, } from '../controllers/aiGenerationController.js';
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
// AI Generation Job routes
router.post('/jobs', authMiddleware, orgMiddleware, upload.single('pdfFile'), createJob);
router.get('/jobs', authMiddleware, orgMiddleware, getJobs);
router.get('/jobs/:id', authMiddleware, orgMiddleware, getJob);
router.put('/jobs/:id/status', authMiddleware, orgMiddleware, updateJobStatus);
router.delete('/jobs/:id', authMiddleware, orgMiddleware, deleteJob);
// Generated question management
router.put('/jobs/:id/questions/:questionId', authMiddleware, updateGeneratedQuestion);
router.put('/jobs/:id/questions/:questionId/content', authMiddleware, updateGeneratedQuestionContent);
router.post('/jobs/:id/questions/:questionId/regenerate', authMiddleware, regenerateGeneratedQuestion);
router.delete('/jobs/:id/questions/:questionId', authMiddleware, deleteGeneratedQuestion);
// Approve all and create quiz
router.post('/jobs/:id/approve-all', authMiddleware, approveAllAndCreateQuiz);
export default router;
