import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';
export const register = async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingEmail = await prisma.user.findUnique({ where: { email } });
        if (existingEmail) {
            res.status(400).json({ message: 'Email already in use' });
            return;
        }
        const hashedPassword = bcrypt.hashSync(password, 8);
        const user = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
            },
        });
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword, token });
    }
    catch (error) {
        const err = error;
        res.status(400).json({ message: err.message });
    }
};
export const login = async (req, res) => {
    passport.authenticate('local', { session: false }, (err, user, info) => {
        if (err) {
            return res.status(500).json({ message: 'Authentication error' });
        }
        if (!user) {
            return res.status(401).json({ message: info?.message || 'Invalid credentials' });
        }
        const typedUser = user;
        const token = jwt.sign({ id: typedUser.id }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });
        const { password: _, ...userWithoutPassword } = typedUser;
        res.json({ user: userWithoutPassword, token });
    })(req, res);
};
export const googleLogin = (req, res) => {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
};
export const googleCallback = (req, res) => {
    passport.authenticate('google', { session: false }, (err, user) => {
        if (err || !user) {
            return res.redirect('http://localhost:5173/login?error=Google auth failed');
        }
        const typedUser = user;
        const token = jwt.sign({ id: typedUser.id }, process.env.JWT_SECRET, {
            expiresIn: '24h',
        });
        // Redirect back to frontend with token and user data
        // Note: In production, use a more secure way to pass the token (e.g., hidden form or temporary session)
        const userData = encodeURIComponent(JSON.stringify({
            id: typedUser.id,
            username: typedUser.username,
            email: typedUser.email
        }));
        res.redirect(`http://localhost:5173/login?token=${token}&user=${userData}`);
    })(req, res);
};
