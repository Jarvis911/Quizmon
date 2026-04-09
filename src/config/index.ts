import 'dotenv/config';

export const PORT = process.env.PORT || 3000;
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export default {
    PORT,
    FRONTEND_URL,
    BACKEND_URL,
    REDIS_URL,
};
