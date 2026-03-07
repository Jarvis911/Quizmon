import { Request, Response } from 'express';
export declare const createClassroom: (req: Request, res: Response) => Promise<void>;
export declare const getClassrooms: (req: Request, res: Response) => Promise<void>;
export declare const getClassroomById: (req: Request, res: Response) => Promise<void>;
export declare const joinClassroom: (req: Request, res: Response) => Promise<void>;
