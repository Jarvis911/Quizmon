import { QuestionType, MediaType, ImageEffect } from '@prisma/client';
export interface MediaItem {
    type: MediaType;
    url: string;
    startTime?: number | null;
    duration?: number | null;
    effect?: ImageEffect | null;
    zoomX?: number | null;
    zoomY?: number | null;
}
export interface QuestionOption {
    text: string;
    isCorrect?: boolean;
    order?: number | null;
}
export interface QuestionData {
    quizId: number;
    text: string;
    type: QuestionType;
    media?: MediaItem[];
    options?: QuestionOption[];
    correctAnswer?: string;
    correctLatitude?: number;
    correctLongitude?: number;
    radius1000?: number;
    radius750?: number;
    radius500?: number;
    mapType?: string;
}
export declare const createQuestion: (questionData: QuestionData) => Promise<any>;
export declare const updateQuestion: (id: number, questionData: Partial<QuestionData>) => Promise<any>;
