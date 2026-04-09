import { Router } from 'express';
import multer from 'multer';
import authMiddleware from '../middleware/authMiddleware.js';
import orgMiddleware from '../middleware/orgMiddleware.js';
import {
    createJob,
    getJobs,
    getJob,
    updateGeneratedQuestion,
    regenerateGeneratedQuestion,
    updateGeneratedQuestionContent,
    deleteGeneratedQuestion,
    approveAllAndCreateQuiz,
    updateJobStatus,
    deleteJob,
    finalizeAgenticQuiz,
    getAgentChatSessions,
    getAgentChatSession,
    deleteAgentChatSession,
    renameAgentChatSession,
} from '../controllers/aiGenerationController.js';

const router: Router = Router();
const upload = multer({ storage: multer.memoryStorage() });

/** Must accept pdfFile and imageFiles together (same as frontend FormData). */
const uploadJobFiles = upload.fields([
    { name: 'pdfFile', maxCount: 1 },
    { name: 'imageFiles', maxCount: 24 },
]);

// AI Generation Job routes
router.post('/jobs', authMiddleware, orgMiddleware, uploadJobFiles, createJob);
router.get('/jobs', authMiddleware, orgMiddleware, getJobs);
router.get('/jobs/:id', authMiddleware, orgMiddleware, getJob);
router.put('/jobs/:id/status', authMiddleware, orgMiddleware, updateJobStatus);
router.delete('/jobs/:id', authMiddleware, orgMiddleware, deleteJob);

// Generated question management
router.put('/jobs/:id/questions/:questionId', authMiddleware, orgMiddleware, updateGeneratedQuestion);
router.put('/jobs/:id/questions/:questionId/content', authMiddleware, orgMiddleware, updateGeneratedQuestionContent);
router.post('/jobs/:id/questions/:questionId/regenerate', authMiddleware, orgMiddleware, regenerateGeneratedQuestion);
router.delete('/jobs/:id/questions/:questionId', authMiddleware, orgMiddleware, deleteGeneratedQuestion);

// Approve all and create quiz
router.post('/jobs/:id/approve-all', authMiddleware, orgMiddleware, approveAllAndCreateQuiz);

// Agentic Workspace routes
router.post('/agentic/save', authMiddleware, orgMiddleware, finalizeAgenticQuiz);
router.get('/agentic/sessions', authMiddleware, getAgentChatSessions);
router.get('/agentic/sessions/:id', authMiddleware, getAgentChatSession);
router.delete('/agentic/sessions/:id', authMiddleware, deleteAgentChatSession);
router.put('/agentic/sessions/:id', authMiddleware, renameAgentChatSession);

export default router;
