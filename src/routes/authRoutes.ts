import { Router } from 'express';
import logMiddleware from '../middleware/logMiddleware.js';
import { register, login, googleLogin, googleCallback } from '../controllers/authController.js';

const router: Router = Router();

router.post('/register', register);
router.post('/login', logMiddleware, login);

// Google Auth
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

export default router;
