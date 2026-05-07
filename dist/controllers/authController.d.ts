import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response) => Promise<void>;
export declare const login: (req: Request, res: Response) => Promise<void>;
export declare const googleLogin: (req: Request, res: Response) => void;
export declare const googleCallback: (req: Request, res: Response) => void;
