import { Request, Response } from 'express';
import { QuestionType } from '@prisma/client';
import {
    createQuestion as createQuestionService,
    updateQuestion as updateQuestionService,
    QuestionData,
} from '../services/questionService.js';
import { uploadMedia } from '../services/uploadMediaService.js';
import prisma from '../prismaClient.js';

interface VideoInput {
    url: string;
    startTime?: number;
    duration?: number;
}

// Get retrieve question
export const getRetrieveQuestion = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const question = await prisma.question.findMany({
            where: {
                id: Number(id),
            },
            include: {
                media: true,
                options: true,
                quiz: {
                    select: { id: true, title: true },
                },
            },
        });

        res.status(200).json(question);
    } catch (err) {
        res.status(500).json({ message: 'Server error during getting the question' });
    }
};

// Button question
export const createButtonQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'BUTTONS' as QuestionType,
            media: questionMedia,
            options: JSON.parse(options),
        };

        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during button question creation' });
    }
};

export const updateButtonQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'BUTTONS' as QuestionType,
            media: questionMedia,
            options: JSON.parse(options),
        };

        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during button question updating' });
    }
};

// Checkbox question
export const createCheckboxQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: Number(quizId),
            text,
            type: 'CHECKBOXES' as QuestionType,
            media: questionMedia,
            options: JSON.parse(options),
        };

        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during checkbox question creation' });
    }
};

export const updateCheckboxQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'CHECKBOXES' as QuestionType,
            media: questionMedia,
            options: JSON.parse(options),
        };

        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during checkbox question updating' });
    }
};


// Reorder question
export const createReorderQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'REORDER' as QuestionType,
            media: questionMedia,
            options: JSON.parse(options),
        };

        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during reorder question creation' });
    }
};

export const updateReorderQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;
    const { id } = req.params;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'REORDER' as QuestionType,
            media: questionMedia,
            options: JSON.parse(options),
        };

        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during reorder question updating' });
    }
};

// Location question
export const createLocationQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, correctLatitude, correctLongitude, optionsData, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        correctLatitude: string;
        correctLongitude: string;
        optionsData?: any;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        let parsedOptionsData: any = {};
        try {
            if (optionsData) parsedOptionsData = typeof optionsData === 'string' ? JSON.parse(optionsData) : optionsData;
        } catch(e) {}

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'LOCATION' as QuestionType,
            correctLatitude: parseFloat(correctLatitude),
            correctLongitude: parseFloat(correctLongitude),
            radius1000: parsedOptionsData.radius1000,
            radius750: parsedOptionsData.radius750,
            radius500: parsedOptionsData.radius500,
            mapType: parsedOptionsData.mapType,
            media: questionMedia,
        };

        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during location question creation' });
    }
};

export const updateLocationQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, correctLatitude, correctLongitude, optionsData, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        correctLatitude: string;
        correctLongitude: string;
        optionsData?: any;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;
    const { id } = req.params;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        let parsedOptionsData: any = {};
        try {
            if (optionsData) parsedOptionsData = typeof optionsData === 'string' ? JSON.parse(optionsData) : optionsData;
        } catch(e) {}

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'LOCATION' as QuestionType,
            correctLatitude: parseFloat(correctLatitude),
            correctLongitude: parseFloat(correctLongitude),
            radius1000: parsedOptionsData.radius1000,
            radius750: parsedOptionsData.radius750,
            radius500: parsedOptionsData.radius500,
            mapType: parsedOptionsData.mapType,
            media: questionMedia,
        };

        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during location question updating' });
    }
};

// Type answer question
export const createTypeAnswerQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, correctAnswer, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        correctAnswer: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'TYPEANSWER' as QuestionType,
            correctAnswer,
            media: questionMedia,
        };

        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during type answer question creation' });
    }
};

export const updateTypeAnswerQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, correctAnswer, videos, imageEffect, zoomX, zoomY } = req.body as {
        quizId: string;
        text: string;
        correctAnswer: string;
        videos?: string;
        imageEffect?: string;
        zoomX?: string;
        zoomY?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;
    const { id } = req.params;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null,
            imageEffect,
            zoomX ? parseFloat(zoomX) : undefined,
            zoomY ? parseFloat(zoomY) : undefined
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'TYPEANSWER' as QuestionType,
            correctAnswer,
            media: questionMedia,
        };

        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during type answer question updating' });
    }
};

export const deleteQuestion = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);

    try {
        const question = await prisma.question.findUnique({
            where: { id: Number(id) },
            include: { quiz: true },
        });

        if (!question) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }

        // Ownership check
        if (question.quiz.creatorId !== userId) {
            // Check if user is in the same organization as the quiz
            if (req.organizationId && question.quiz.organizationId === req.organizationId) {
                // Allow deletion by same org
            } else {
                res.status(403).json({ message: 'You do not have permission to delete this question' });
                return;
            }
        }

        await prisma.question.delete({
            where: { id: Number(id) },
        });

        res.status(200).json({ message: 'Question deleted successfully' });
    } catch (err) {
        const error = err as Error;
        console.error('Delete Question Error:', error);
        res.status(500).json({ message: error.message });
    }
};

