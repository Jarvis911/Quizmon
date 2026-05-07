import { Router, Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
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
import { generateImage } from '../controllers/aiImageController.js';

const router: Router = Router();

const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** 20 MB per file; max 25 files (1 PDF + 24 images). PDF and image MIME types are enforced. */
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 20 * 1024 * 1024, // 20 MB per file
        files: 25,                   // 1 PDF + up to 24 images
    },
    fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'pdfFile') {
            if (file.mimetype === 'application/pdf') return cb(null, true);
            return cb(new Error('pdfFile must be a PDF document'));
        }
        if (file.fieldname === 'imageFiles') {
            if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) return cb(null, true);
            return cb(new Error('imageFiles must be JPEG, PNG, WebP, or GIF'));
        }
        return cb(new Error('Unexpected upload field'));
    },
});

/** Must accept pdfFile and imageFiles together (same as frontend FormData). */
const _uploadJobFiles = upload.fields([
    { name: 'pdfFile', maxCount: 1 },
    { name: 'imageFiles', maxCount: 24 },
]);

/** Wraps multer so that size/type errors return 400 instead of crashing. */
function handleUpload(req: Request, res: Response, next: NextFunction): void {
    _uploadJobFiles(req, res, (err) => {
        if (err instanceof MulterError) {
            res.status(400).json({ error: `Upload error: ${err.message}` });
            return;
        }
        if (err) {
            res.status(400).json({ error: (err as Error).message });
            return;
        }
        next();
    });
}

// AI Generation Job routes
router.post('/jobs', authMiddleware, orgMiddleware, handleUpload, createJob);
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

// On-demand AI image generation
router.post('/generate-image', authMiddleware, orgMiddleware, generateImage);

// Agentic Workspace routes
router.post('/agentic/save', authMiddleware, orgMiddleware, finalizeAgenticQuiz);
router.get('/agentic/sessions', authMiddleware, getAgentChatSessions);
router.get('/agentic/sessions/:id', authMiddleware, getAgentChatSession);
router.delete('/agentic/sessions/:id', authMiddleware, deleteAgentChatSession);
router.put('/agentic/sessions/:id', authMiddleware, renameAgentChatSession);

export default router;
