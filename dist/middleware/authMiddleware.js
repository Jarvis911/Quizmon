import passport from '../config/passport.js';
const authMiddleware = (req, res, next) => {
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Authentication error' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        req.userId = user.id;
        next();
    })(req, res, next);
};
export const optionalAuthMiddleware = (req, res, next) => {
    if (!req.headers.authorization) {
        next();
        return;
    }
    passport.authenticate('jwt', { session: false }, (err, user) => {
        if (err) {
            return res.status(500).json({ message: 'Authentication error' });
        }
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.user = user;
        req.userId = user.id;
        next();
    })(req, res, next);
};
export default authMiddleware;
