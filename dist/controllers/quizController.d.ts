import { Request, Response } from 'express';
export declare const createQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getRetrieveQuiz: (req: Request, res: Response) => Promise<void>;
export declare const updateQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuestionByQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuizRating: (req: Request, res: Response) => Promise<void>;
export declare const checkUserRateQuiz: (req: Request, res: Response) => Promise<void>;
