import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { postRating } from '../controllers/ratingController.js';

const router: Router = Router();


/**
 * @swagger
 * /rating:
 *   post:
 *     summary: Rate a quiz
 *     tags: [Rating]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quizId:
 *                 type: integer
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Rating submitted
 */
router.post('/', authMiddleware, postRating);

export default router;
