import { QuestionType, MediaType, ImageEffect, Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';
import { notificationService } from './notificationService.js';

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
    // Type-specific fields (will be stored in `data` JSON column)
    correctAnswer?: string;
    correctLatitude?: number;
    correctLongitude?: number;
    radius1000?: number;
    radius750?: number;
    radius500?: number;
    mapType?: string;
}

/** Build the `data` JSON column value based on question type */
function buildQuestionData(
    type: QuestionType,
    fields: Pick<QuestionData, 'correctAnswer' | 'correctLatitude' | 'correctLongitude' | 'radius1000' | 'radius750' | 'radius500' | 'mapType'>
): Prisma.InputJsonValue | undefined {
    switch (type) {
        case 'TYPEANSWER':
            return { correctAnswer: fields.correctAnswer! };
        case 'LOCATION':
            return {
                correctLatitude: fields.correctLatitude!,
                correctLongitude: fields.correctLongitude!,
                radius1000: fields.radius1000,
                radius750: fields.radius750,
                radius500: fields.radius500,
                mapType: fields.mapType,
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
            correctAnswer,
            correctLatitude,
            correctLongitude,
            radius1000,
            radius750,
            radius500,
            mapType,
        } = questionData;

        const dataJson = buildQuestionData(type, {
            correctAnswer, correctLatitude, correctLongitude,
            radius1000, radius750, radius500, mapType
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
                        zoomX: m.zoomX || 0.5,
                        zoomY: m.zoomY || 0.5,
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
                    select: { id: true, title: true, creatorId: true },
                },
            },
        });

        // Send notification
        await notificationService.createNotification(
            question.quiz.creatorId,
            `Bạn đã thêm một câu hỏi mới vào bộ: ${question.quiz.title}`,
            'QUESTION_CREATED',
            `/library/${question.quiz.id}`
        );

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
            correctAnswer,
            correctLatitude,
            correctLongitude,
            radius1000,
            radius750,
            radius500,
            mapType,
        } = questionData;

        const dataJson = type
            ? buildQuestionData(type, {
                  correctAnswer, correctLatitude, correctLongitude,
                  radius1000, radius750, radius500, mapType
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
                        zoomX: m.zoomX || 0.5,
                        zoomY: m.zoomY || 0.5,
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
                quiz: {
                    select: { id: true, title: true, creatorId: true },
                },
            },
        });

        // Send notification
        if (updated.quiz) {
            await notificationService.createNotification(
                updated.quiz.creatorId,
                `Bạn đã cập nhật câu hỏi trong bộ: ${updated.quiz.title}`,
                'QUESTION_UPDATED',
                `/library/${updated.quiz.id}`
            );
        }

        return updated;
    } catch (err) {
        const error = err as Error;
        console.error(error.message);
        throw err;
    }
};
