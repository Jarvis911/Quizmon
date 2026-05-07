import { Router } from 'express';
import authMiddleware, { optionalAuthMiddleware } from '../middleware/authMiddleware.js';
import orgMiddleware from '../middleware/orgMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { getQuiz, createQuiz, updateQuiz, deleteQuiz, getRetrieveQuiz, getQuestionByQuiz, checkUserRateQuiz, getQuizRating, exploreQuizzes, getOrgQuizzes, replicateQuiz, assignQuizToOrg, removeQuizFromOrg, getAssignableQuizzes, checkoutQuiz, checkinQuiz, forceCheckinQuiz } from '../controllers/quizController.js';

const router: Router = Router();

// Create Quiz
/**
 * @swagger
 * /quiz:
 *   post:
 *     summary: Create a new quiz
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Quiz cover image
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               visibility:
 *                 type: string
 *     responses:
 *       201:
 *         description: Quiz created successfully
 */
router.post('/', authMiddleware, orgMiddleware, upload.single('file'), createQuiz);

// Update Quiz
/**
 * @swagger
 * /quiz/{id}:
 *   put:
 *     summary: Update a quiz
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Quiz cover image
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               categoryId:
 *                 type: integer
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Quiz updated successfully
 */
router.put('/:id', authMiddleware, orgMiddleware, upload.single('file'), updateQuiz);

// Get All Quizzes
/**
 * @swagger
 * /quiz:
 *   get:
 *     summary: Get all quizzes
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of quizzes
 */
router.get('/', authMiddleware, orgMiddleware, getQuiz);

// Explore Public Quizzes
router.get('/explore', exploreQuizzes);

// Get organization library (all quizzes in current org)
router.get('/org-library', authMiddleware, orgMiddleware, getOrgQuizzes);

// Get assignable quizzes for homework (org-scoped)
router.get('/assignable', authMiddleware, orgMiddleware, getAssignableQuizzes);

// Get Quiz Questions
/**
 * @swagger
 * /quiz/{id}/question:
 *   get:
 *     summary: Get questions by quiz ID
 *     tags: [Quiz]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of questions
 */
router.get('/:id/question', optionalAuthMiddleware, orgMiddleware, getQuestionByQuiz);

// Get Retrieve Quiz
/**
 * @swagger
 * /quiz/{id}:
 *   get:
 *     summary: Retrieve a specific quiz
 *     tags: [Quiz]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Quiz details
 */
router.get('/:id', optionalAuthMiddleware, orgMiddleware, getRetrieveQuiz);

// Check User Rate
/**
 * @swagger
 * /quiz/{id}/rated:
 *   get:
 *     summary: Check if user has rated the quiz
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Rating status
 */
router.get('/:id/rated', authMiddleware, orgMiddleware, checkUserRateQuiz);

// Get Quiz Rating
/**
 * @swagger
 * /quiz/{id}/rating:
 *   get:
 *     summary: Get quiz rating
 *     tags: [Quiz]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Quiz rating
 */
router.get('/:id/rating', getQuizRating);

// Delete Quiz
router.delete('/:id', authMiddleware, orgMiddleware, deleteQuiz);

// Replicate a public quiz to personal library
router.post('/:id/replicate', authMiddleware, orgMiddleware, replicateQuiz);

// Assign quiz to org / remove from org
router.post('/:id/assign-to-org', authMiddleware, orgMiddleware, assignQuizToOrg);
router.post('/:id/remove-from-org', authMiddleware, orgMiddleware, removeQuizFromOrg);

// Checkout lock
router.post('/:id/checkout', authMiddleware, orgMiddleware, checkoutQuiz);
router.post('/:id/checkin', authMiddleware, orgMiddleware, checkinQuiz);
router.post('/:id/force-checkin', authMiddleware, orgMiddleware, forceCheckinQuiz);

export default router;
