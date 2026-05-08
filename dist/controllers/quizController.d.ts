import { Request, Response } from 'express';
type QuizWithId = {
    id: number;
};
type QuizRatingStats = {
    ratingAverage: number;
    ratingCount: number;
};
export declare const attachRatingStats: <T extends QuizWithId>(quizzes: T[]) => Promise<(T & QuizRatingStats)[]>;
export declare const createQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuiz: (req: Request, res: Response) => Promise<void>;
export declare const exploreQuizzes: (req: Request, res: Response) => Promise<void>;
export declare const getRetrieveQuiz: (req: Request, res: Response) => Promise<void>;
export declare const updateQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuestionByQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getQuizRating: (req: Request, res: Response) => Promise<void>;
export declare const checkUserRateQuiz: (req: Request, res: Response) => Promise<void>;
export declare const deleteQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getOrgQuizzes: (req: Request, res: Response) => Promise<void>;
export declare const replicateQuiz: (req: Request, res: Response) => Promise<void>;
export declare const assignQuizToOrg: (req: Request, res: Response) => Promise<void>;
export declare const removeQuizFromOrg: (req: Request, res: Response) => Promise<void>;
export declare const checkoutQuiz: (req: Request, res: Response) => Promise<void>;
export declare const checkinQuiz: (req: Request, res: Response) => Promise<void>;
export declare const forceCheckinQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getAssignableQuizzes: (req: Request, res: Response) => Promise<void>;
export {};
