import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import logMiddleware from '../middleware/logMiddleware.js';
import { createMatch, getMatch, updateMatch } from '../controllers/matchController.js';

const router: Router = Router();


/**
 * @swagger
 * /match:
 *   post:
 *     summary: Create a new match
 *     tags: [Match]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Match created
 */
router.post('/', authMiddleware, logMiddleware, createMatch);

/**
 * @swagger
 * /match/{id}:
 *   get:
 *     summary: Get match details
 *     tags: [Match]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Match details
 */
router.get('/:id', getMatch);

/**
 * @swagger
 * /match/{id}:
 *   put:
 *     summary: Update match details
 *     tags: [Match]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Match updated
 */
router.put('/:id', updateMatch);

export default router;
