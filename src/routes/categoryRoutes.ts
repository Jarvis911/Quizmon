import { Router } from 'express';
import { createCategory, getCategory, getQuizByCate } from '../controllers/categoryController.js';

const router: Router = Router();

/**
 * @swagger
 * /category:
 *   post:
 *     summary: Create a new category
 *     tags: [Category]
 *     responses:
 *       201:
 *         description: Category created
 */
router.post('/', createCategory);

/**
 * @swagger
 * /category:
 *   get:
 *     summary: Get all categories
 *     tags: [Category]
 *     responses:
 *       200:
 *         description: List of categories
 */
router.get('/', getCategory);

/**
 * @swagger
 * /category/{id}/quiz:
 *   get:
 *     summary: Get quizzes by category
 *     tags: [Category]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of quizzes
 */
router.get('/:id/quiz', getQuizByCate);

export default router;
