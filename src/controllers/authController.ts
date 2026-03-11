import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';

import { createOrganization } from '../services/organizationService.js';

export const register = async (req: Request, res: Response): Promise<void> => {
    const { username, email, password } = req.body as { username?: string; email: string; password: string };

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

        // Auto-create personal organization for the user
        try {
            const orgName = username ? `${username}'s Org` : "Personal Organization";
            await createOrganization(orgName, user.id);
        } catch (orgErr) {
            console.error('[register] Failed to create default org:', orgErr);
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET as string, {
            expiresIn: '24h',
        });

        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ user: userWithoutPassword, token });
    } catch (error) {
        const err = error as Error;
        res.status(400).json({ message: err.message });
    }
};

export const login = async (req: Request, res: Response): Promise<void> => {
    passport.authenticate('local', { session: false }, (err: Error | null, user: Express.User | false, info: { message: string } | undefined) => {
        if (err) {
            return res.status(500).json({ message: 'Authentication error' });
        }

        if (!user) {
            return res.status(401).json({ message: info?.message || 'Invalid credentials' });
        }

        const typedUser = user as { id: number; username: string; password: string };
        const token = jwt.sign({ id: typedUser.id }, process.env.JWT_SECRET as string, {
            expiresIn: '24h',
        });

        const { password: _, ...userWithoutPassword } = typedUser;
        res.json({ user: userWithoutPassword, token });
    })(req, res);
};

export const googleLogin = (req: Request, res: Response): void => {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res);
};

export const googleCallback = (req: Request, res: Response): void => {
    passport.authenticate('google', { session: false }, (err: Error | null, user: Express.User | false) => {
        if (err || !user) {
            return res.redirect('http://localhost:5173/login?error=Google auth failed');
        }

        const typedUser = user as { id: number; username: string; email: string };
        const token = jwt.sign({ id: typedUser.id }, process.env.JWT_SECRET as string, {
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
