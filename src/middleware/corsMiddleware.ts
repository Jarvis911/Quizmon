import cors from 'cors';
import { RequestHandler } from 'express';

const corsMiddleware: RequestHandler = cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-organization-id'],
});

export default corsMiddleware;
