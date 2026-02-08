import { QuestionType, MediaType } from '@prisma/client';
import prisma from '../prismaClient.js';

export interface MediaItem {
    type: MediaType;
    url: string;
    startTime?: number | null;
    duration?: number | null;
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

export const createQuestion = async (questionData: QuestionData) => {
    try {
        const {
            quizId,
            text,
            type,
            media = [],
            options,
            minValue,
            maxValue,
            correctValue,
            correctAnswer,
            correctLatitude,
            correctLongitude,
        } = questionData;

        const question = await prisma.question.create({
            data: {
                text,
                type,
                quizId,
                ...(type === 'BUTTONS' && { button: { create: {} } }),
                ...(type === 'CHECKBOXES' && { checkbox: { create: {} } }),
                ...(type === 'REORDER' && { reorder: { create: {} } }),
                ...(type === 'RANGE' && {
                    range: {
                        create: {
                            minValue: minValue!,
                            maxValue: maxValue!,
                            correctValue: correctValue!,
                        },
                    },
                }),
                ...(type === 'TYPEANSWER' && {
                    typeAnswer: {
                        create: { correctAnswer: correctAnswer! },
                    },
                }),
                ...(type === 'LOCATION' && {
                    location: {
                        create: {
                            correctLatitude: correctLatitude!,
                            correctLongitude: correctLongitude!,
                        },
                    },
                }),
                media: {
                    create: media.map((m) => ({
                        type: m.type,
                        url: m.url,
                        startTime: m.startTime,
                        duration: m.duration,
                    })),
                },
                options: options && {
                    create: options.map((option) => ({
                        text: option.text,
                        isCorrect: option.isCorrect || false,
                        order: option.order,
                    })),
                },
            },
            include: {
                button: true,
                checkbox: true,
                reorder: true,
                range: true,
                typeAnswer: true,
                location: true,
                media: true,
                options: true,
                quiz: {
                    select: { id: true, title: true },
                },
            },
        });

        return question;
    } catch (err) {
        const error = err as Error;
        console.error(error.message);
        throw err;
    }
};

export const updateQuestion = async (id: number, questionData: Partial<QuestionData>) => {
    try {
        const {
            text,
            type,
            media = [],
            options = [],
            minValue,
            maxValue,
            correctValue,
            correctAnswer,
            correctLatitude,
            correctLongitude,
        } = questionData;

        const updated = await prisma.question.update({
            where: { id: Number(id) },
            data: {
                text,
                type,
                ...(type === 'RANGE' && {
                    range: {
                        upsert: {
                            update: { minValue, maxValue, correctValue },
                            create: { minValue: minValue!, maxValue: maxValue!, correctValue: correctValue! },
                        },
                    },
                }),
                ...(type === 'TYPEANSWER' && {
                    typeAnswer: {
                        upsert: {
                            update: { correctAnswer },
                            create: { correctAnswer: correctAnswer! },
                        },
                    },
                }),
                ...(type === 'LOCATION' && {
                    location: {
                        upsert: {
                            update: { correctLatitude, correctLongitude },
                            create: { correctLatitude: correctLatitude!, correctLongitude: correctLongitude! },
                        },
                    },
                }),
                media: {
                    deleteMany: {},
                    create: media.map((m) => ({
                        type: m.type,
                        url: m.url,
                        startTime: m.startTime,
                        duration: m.duration,
                    })),
                },
                options: {
                    deleteMany: {},
                    create: options.map((o) => ({
                        text: o.text,
                        isCorrect: o.isCorrect || false,
                        order: o.order,
                    })),
                },
            },
            include: {
                button: true,
                checkbox: true,
                reorder: true,
                range: true,
                typeAnswer: true,
                location: true,
                media: true,
                options: true,
            },
        });

        return updated;
    } catch (err) {
        const error = err as Error;
        console.error(error.message);
        throw err;
    }
};
