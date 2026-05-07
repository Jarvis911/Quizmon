import { Request, Response } from "express";
export declare const getNotifications: (req: Request, res: Response) => Promise<void>;
export declare const markAsRead: (req: Request, res: Response) => Promise<void>;
export declare const markAllAsRead: (req: Request, res: Response) => Promise<void>;
