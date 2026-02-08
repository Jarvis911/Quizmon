import passport from '../config/passport.js';
import { RequestHandler } from 'express';

const authMiddleware: RequestHandler = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err: Error | null, user: Express.User | false) => {
        if (err) {
            return res.status(500).json({ message: 'Authentication error' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        req.userId = (user as { id: number }).id;
        next();
    })(req, res, next);
};

export default authMiddleware;
