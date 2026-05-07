import { Request, Response } from 'express';
export declare const createAnswer: (req: Request, res: Response) => Promise<void>;
export declare const getMatchAnswers: (req: Request, res: Response) => Promise<void>;
export declare const getParticipantAnswers: (req: Request, res: Response) => Promise<void>;
