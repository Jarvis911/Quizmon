import { Prisma } from '@prisma/client';
import prisma from '../prismaClient.js';
/** Build the `data` JSON column value based on question type */
function buildQuestionData(type, fields) {
    switch (type) {
        case 'RANGE':
            return {
                minValue: fields.minValue,
                maxValue: fields.maxValue,
                correctValue: fields.correctValue,
            };
        case 'TYPEANSWER':
            return { correctAnswer: fields.correctAnswer };
        case 'LOCATION':
            return {
                correctLatitude: fields.correctLatitude,
                correctLongitude: fields.correctLongitude,
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
export const createQuestion = async (questionData) => {
    try {
        const { quizId, text, type, media = [], options, minValue, maxValue, correctValue, correctAnswer, correctLatitude, correctLongitude, radius1000, radius750, radius500, mapType, } = questionData;
        const dataJson = buildQuestionData(type, {
            minValue, maxValue, correctValue, correctAnswer, correctLatitude, correctLongitude,
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
    }
    catch (err) {
        const error = err;
        console.error(error.message);
        throw err;
    }
};
export const updateQuestion = async (id, questionData) => {
    try {
        const { text, type, media = [], options = [], minValue, maxValue, correctValue, correctAnswer, correctLatitude, correctLongitude, radius1000, radius750, radius500, mapType, } = questionData;
        const dataJson = type
            ? buildQuestionData(type, {
                minValue, maxValue, correctValue, correctAnswer, correctLatitude, correctLongitude,
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
    }
    catch (err) {
        const error = err;
        console.error(error.message);
        throw err;
    }
};
