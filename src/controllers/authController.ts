import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import passport from '../config/passport.js';

export const register = async (req: Request, res: Response): Promise<void> => {
    const { username, password } = req.body as { username: string; password: string };

    try {
        const hashedPassword = bcrypt.hashSync(password, 8);

        const user = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
            },
        });

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
