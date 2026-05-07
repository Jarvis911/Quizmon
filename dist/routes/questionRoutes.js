import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';
import { createButtonQuestion, updateButtonQuestion, createCheckboxQuestion, updateCheckboxQuestion, createReorderQuestion, updateReorderQuestion, createLocationQuestion, updateLocationQuestion, createTypeAnswerQuestion, updateTypeAnswerQuestion, getRetrieveQuestion, deleteQuestion, } from '../controllers/questionController.js';
const router = Router();
/**
 * @swagger
 * /question/buttons:
 *   post:
 *     summary: Create a Buttons type question
 *     tags: [Question]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Question created
 */
router.post('/buttons', authMiddleware, logMiddleware, upload.array('files', 5), createButtonQuestion);
/**
 * @swagger
 * /question/buttons/{id}:
 *   put:
 *     summary: Update a Buttons type question
 *     tags: [Question]
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Question updated
 */
router.put('/buttons/:id', authMiddleware, upload.array('files', 5), updateButtonQuestion);
/**
 * @swagger
 * /question/checkboxes:
 *   post:
 *     summary: Create a Checkboxes type question
 *     tags: [Question]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Question created
 */
router.post('/checkboxes', authMiddleware, logMiddleware, upload.array('files', 5), createCheckboxQuestion);
/**
 * @swagger
 * /question/checkboxes/{id}:
 *   put:
 *     summary: Update a Checkboxes type question
 *     tags: [Question]
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Question updated
 */
router.put('/checkboxes/:id', authMiddleware, upload.array('files', 5), updateCheckboxQuestion);
/**
 * @swagger
 * /question/reorder:
 *   post:
 *     summary: Create a Reorder type question
 *     tags: [Question]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Question created
 */
router.post('/reorder', authMiddleware, logMiddleware, upload.array('files', 5), createReorderQuestion);
/**
 * @swagger
 * /question/reorder/{id}:
 *   put:
 *     summary: Update a Reorder type question
 *     tags: [Question]
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Question updated
 */
router.put('/reorder/:id', authMiddleware, logMiddleware, upload.array('files', 5), updateReorderQuestion);
/**
 * @swagger
 * /question/location:
 *   post:
 *     summary: Create a Location type question
 *     tags: [Question]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Question created
 */
router.post('/location', authMiddleware, logMiddleware, createLocationQuestion);
/**
 * @swagger
 * /question/location/{id}:
 *   put:
 *     summary: Update a Location type question
 *     tags: [Question]
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
 *         description: Question updated
 */
router.put('/location/:id', authMiddleware, logMiddleware, updateLocationQuestion);
/**
 * @swagger
 * /question/typeanswer:
 *   post:
 *     summary: Create a Type Answer type question
 *     tags: [Question]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Question created
 */
router.post('/typeanswer', authMiddleware, logMiddleware, upload.array('files', 5), createTypeAnswerQuestion);
/**
 * @swagger
 * /question/typeanswer/{id}:
 *   put:
 *     summary: Update a Type Answer type question
 *     tags: [Question]
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
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Question updated
 */
router.put('/typeanswer/:id', authMiddleware, logMiddleware, upload.array('files', 5), updateTypeAnswerQuestion);
/**
 * @swagger
 * /question/{id}:
 *   get:
 *     summary: Retrieve a question
 *     tags: [Question]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Question details
 */
router.get('/:id', getRetrieveQuestion);
// Delete Question
/**
 * @swagger
 * /question/{id}:
 *   delete:
 *     summary: Delete a question
 *     tags: [Question]
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
 *         description: Question deleted successfully
 *       404:
 *         description: Question not found
 *       403:
 *         description: Permission denied
 */
router.delete('/:id', authMiddleware, deleteQuestion);
export default router;
