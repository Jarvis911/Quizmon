import { Router } from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import { createOrg, getOrgs, getOrg, updateOrg, addOrgMember, removeOrgMember, updateOrgMemberRole, searchOrgUsers, getOrgFeatures, } from '../controllers/organizationController.js';
const router = Router();
/**
 * @swagger
 * /organizations:
 *   post:
 *     summary: Create a new organization
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Organization created
 */
router.post('/', authMiddleware, createOrg);
/**
 * @swagger
 * /organizations:
 *   get:
 *     summary: List user's organizations
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of organizations
 */
router.get('/', authMiddleware, getOrgs);
/**
 * @swagger
 * /organizations/users/search:
 *   get:
 *     summary: Search for users to invite
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of matching users
 */
router.get('/users/search', authMiddleware, searchOrgUsers);
/**
 * @swagger
 * /organizations/{id}:
 *   get:
 *     summary: Get organization details
 *     tags: [Organization]
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
 *         description: Organization details
 */
router.get('/:id', authMiddleware, getOrg);
/**
 * @swagger
 * /organizations/{id}/features:
 *   get:
 *     summary: Get feature statuses for an organization
 *     tags: [Organization]
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
 *         description: Feature statuses
 */
router.get('/:id/features', authMiddleware, getOrgFeatures);
/**
 * @swagger
 * /organizations/{id}:
 *   put:
 *     summary: Update organization (Admin/Owner only)
 *     tags: [Organization]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               logoUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organization updated
 */
router.put('/:id', authMiddleware, updateOrg);
/**
 * @swagger
 * /organizations/{id}/members:
 *   post:
 *     summary: Add member to organization (Admin/Owner only)
 *     tags: [Organization]
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
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId:
 *                 type: integer
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, TEACHER, MEMBER]
 *     responses:
 *       201:
 *         description: Member added
 */
router.post('/:id/members', authMiddleware, addOrgMember);
/**
 * @swagger
 * /organizations/{id}/members/{userId}:
 *   delete:
 *     summary: Remove member from organization (Admin/Owner only)
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Member removed
 */
router.delete('/:id/members/:userId', authMiddleware, removeOrgMember);
/**
 * @swagger
 * /organizations/{id}/members/{userId}/role:
 *   put:
 *     summary: Update member role (Admin/Owner only)
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [OWNER, ADMIN, TEACHER, MEMBER]
 *     responses:
 *       200:
 *         description: Role updated
 */
router.put('/:id/members/:userId/role', authMiddleware, updateOrgMemberRole);
export default router;
