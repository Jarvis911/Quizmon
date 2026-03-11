import { QuestionType, MediaType, ImageEffect, Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';

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
    // Type-specific fields (will be stored in `data` JSON column)
    minValue?: number;
    maxValue?: number;
    correctValue?: number;
    correctAnswer?: string;
    correctLatitude?: number;
    correctLongitude?: number;
}

/** Build the `data` JSON column value based on question type */
function buildQuestionData(
    type: QuestionType,
    fields: Pick<QuestionData, 'minValue' | 'maxValue' | 'correctValue' | 'correctAnswer' | 'correctLatitude' | 'correctLongitude'>
): Prisma.InputJsonValue | undefined {
    switch (type) {
        case 'RANGE':
            return {
                minValue: fields.minValue!,
                maxValue: fields.maxValue!,
                correctValue: fields.correctValue!,
            };
        case 'TYPEANSWER':
            return { correctAnswer: fields.correctAnswer! };
        case 'LOCATION':
            return {
                correctLatitude: fields.correctLatitude!,
                correctLongitude: fields.correctLongitude!,
            };
        default:
            // BUTTONS, CHECKBOXES, REORDER — no type-specific data needed
            return undefined;
    }
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

        const dataJson = buildQuestionData(type, {
            minValue, maxValue, correctValue, correctAnswer, correctLatitude, correctLongitude,
        });

        const question = await prisma.question.create({
            data: {
                text,
                type,
                quizId,
                data: dataJson ?? Prisma.DbNull,
                media: {
                    create: media.map((m) => ({
                        type: m.type,
                        url: m.url,
                        startTime: m.startTime,
                        duration: m.duration,
                        effect: m.effect || 'NONE',
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

        const dataJson = type
            ? buildQuestionData(type, {
                  minValue, maxValue, correctValue, correctAnswer, correctLatitude, correctLongitude,
              })
            : undefined;

        const updated = await prisma.question.update({
            where: { id: Number(id) },
            data: {
                text,
                type,
                ...(dataJson !== undefined && { data: dataJson ?? Prisma.DbNull }),
                media: {
                    deleteMany: {},
                    create: media.map((m) => ({
                        type: m.type,
                        url: m.url,
                        startTime: m.startTime,
                        duration: m.duration,
                        effect: m.effect || 'NONE',
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
