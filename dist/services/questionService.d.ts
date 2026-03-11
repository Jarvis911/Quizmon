import { QuestionType, MediaType, ImageEffect, Prisma } from '@prisma/client';
export interface MediaItem {
    type: MediaType;
    url: string;
    startTime?: number | null;
    duration?: number | null;
    effect?: ImageEffect | null;
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
    minValue?: number;
    maxValue?: number;
    correctValue?: number;
    correctAnswer?: string;
    correctLatitude?: number;
    correctLongitude?: number;
}
export declare const createQuestion: (questionData: QuestionData) => Promise<{
    quiz: {
        id: number;
        title: string;
    };
    media: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.MediaType;
        url: string;
        startTime: number | null;
        duration: number | null;
        effect: import("@prisma/client").$Enums.ImageEffect | null;
        questionId: number;
    }[];
    options: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        isCorrect: boolean | null;
        order: number | null;
        questionId: number;
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
    media: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        type: import("@prisma/client").$Enums.MediaType;
        url: string;
        startTime: number | null;
        duration: number | null;
        effect: import("@prisma/client").$Enums.ImageEffect | null;
        questionId: number;
    }[];
    options: {
        id: number;
        createdAt: Date;
        updatedAt: Date;
        text: string;
        isCorrect: boolean | null;
        order: number | null;
        questionId: number;
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
