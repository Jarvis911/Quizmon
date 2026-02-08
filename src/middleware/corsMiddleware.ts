import cors from 'cors';
import { RequestHandler } from 'express';

const corsMiddleware: RequestHandler = cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});

export default corsMiddleware;
