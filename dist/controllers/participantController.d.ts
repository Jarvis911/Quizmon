import { Request, Response } from 'express';
export declare const createParticipant: (req: Request, res: Response) => Promise<void>;
export declare const getParticipants: (req: Request, res: Response) => Promise<void>;
export declare const getParticipant: (req: Request, res: Response) => Promise<void>;
export declare const updateParticipant: (req: Request, res: Response) => Promise<void>;
export declare const deleteParticipant: (req: Request, res: Response) => Promise<void>;
