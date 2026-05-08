import { QuestionType, MediaType, ImageEffect, Prisma } from '@prisma/client';
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
    /** When true, skip the per-question in-app notification (bulk / AI import). */
    skipQuestionNotification?: boolean;
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
export declare const createQuestion: (questionData: QuestionData) => Promise<{
    quiz: {
        id: number;
        title: string;
        creatorId: number;
    };
    options: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        isCorrect: boolean | null;
        order: number | null;
        questionId: number;
    }[];
    media: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.MediaType;
        questionId: number;
        url: string;
        startTime: number | null;
        duration: number | null;
        effect: import("@prisma/client").$Enums.ImageEffect | null;
        zoomX: number | null;
        zoomY: number | null;
    }[];
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    data: Prisma.JsonValue | null;
    type: import("@prisma/client").$Enums.QuestionType;
    text: string;
    quizId: number;
}>;
export declare const updateQuestion: (id: number, questionData: Partial<QuestionData>) => Promise<{
    quiz: {
        id: number;
        title: string;
        creatorId: number;
    };
    options: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        isCorrect: boolean | null;
        order: number | null;
        questionId: number;
    }[];
    media: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.MediaType;
        questionId: number;
        url: string;
        startTime: number | null;
        duration: number | null;
        effect: import("@prisma/client").$Enums.ImageEffect | null;
        zoomX: number | null;
        zoomY: number | null;
    }[];
} & {
    id: number;
    createdAt: Date;
    updatedAt: Date;
    data: Prisma.JsonValue | null;
    type: import("@prisma/client").$Enums.QuestionType;
    text: string;
    quizId: number;
}>;
