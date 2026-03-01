import { Request, Response, NextFunction } from 'express';
declare const logMiddleware: (req: Request, res: Response, next: NextFunction) => void;
export default logMiddleware;
