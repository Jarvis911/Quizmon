import { Request, Response } from 'express';
export declare const getDashboardStats: (req: Request, res: Response) => Promise<void>;
export declare const getQuizzes: (req: Request, res: Response) => Promise<void>;
export declare const deleteQuiz: (req: Request, res: Response) => Promise<void>;
export declare const getReports: (req: Request, res: Response) => Promise<void>;
export declare const resolveReport: (req: Request, res: Response) => Promise<void>;
export declare const getUsers: (req: Request, res: Response) => Promise<void>;
export declare const getAIJobs: (req: Request, res: Response) => Promise<void>;
export declare const getAIConfig: (req: Request, res: Response) => Promise<void>;
export declare const updateAIConfig: (req: Request, res: Response) => Promise<void>;
export declare const getAIConfigOptions: (req: Request, res: Response) => Promise<void>;
/** GET /admin/plans/keys — enum values for subscription plan features (for admin UI). */
export declare const getPlanFeatureKeys: (_req: Request, res: Response) => Promise<void>;
/** GET /admin/plans — all plans including inactive, with features. */
export declare const getAdminPlans: (_req: Request, res: Response) => Promise<void>;
/** PUT /admin/plans/:id — update display/pricing/active flag (`type` is fixed per row). */
export declare const updatePlan: (req: Request, res: Response) => Promise<void>;
/** PUT /admin/plans/:id/features — replace all feature rows for the plan. */
export declare const replacePlanFeatures: (req: Request, res: Response) => Promise<void>;
