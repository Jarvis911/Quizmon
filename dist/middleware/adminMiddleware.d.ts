import { Request, Response, NextFunction } from 'express';
declare const adminMiddleware: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export default adminMiddleware;
