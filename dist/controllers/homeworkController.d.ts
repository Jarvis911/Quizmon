import { Request, Response } from 'express';
export declare const createHomeworkMatch: (req: Request, res: Response) => Promise<void>;
export declare const startHomework: (req: Request, res: Response) => Promise<void>;
export declare const submitHomeworkAnswer: (req: Request, res: Response) => Promise<void>;
export declare const finishHomework: (req: Request, res: Response) => Promise<void>;
