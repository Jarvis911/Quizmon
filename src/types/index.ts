import { User } from '@prisma/client';

declare global {
    namespace Express {
        interface Request {
            userId?: number;
            user?: User;
        }
    }
}

export interface JwtPayload {
    id: number;
    iat?: number;
    exp?: number;
}

export interface LoginCredentials {
    username: string;
    password: string;
}

export interface AuthResponse {
    user: Omit<User, 'password'>;
    token: string;
}
