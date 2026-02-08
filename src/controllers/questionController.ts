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

        res.status(200).json(question);
    } catch (err) {
        res.status(500).json({ message: 'Server error during getting the question' });
    }
};

// Button question
export const createButtonQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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
    const { quizId, text, options, videos } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
    };
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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
    const { quizId, text, options, videos } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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
    const { quizId, text, options, videos } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
    };
    const { id } = req.params;
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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

// Range question
export const createRangeQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, minValue, maxValue, correctValue, videos } = req.body as {
        quizId: string;
        text: string;
        minValue: string;
        maxValue: string;
        correctValue: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
        );

        const questionData: QuestionData = {
            quizId: Number(quizId),
            text,
            type: 'RANGE' as QuestionType,
            minValue: Number(minValue),
            maxValue: Number(maxValue),
            correctValue: Number(correctValue),
            media: questionMedia,
        };

        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during range question creation' });
    }
};

export const updateRangeQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, minValue, maxValue, correctValue, videos } = req.body as {
        quizId: string;
        text: string;
        minValue: string;
        maxValue: string;
        correctValue: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;
    const { id } = req.params;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'RANGE' as QuestionType,
            minValue: parseInt(minValue),
            maxValue: parseInt(maxValue),
            correctValue: parseInt(correctValue),
            media: questionMedia,
        };

        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(201).json(updatedQuestion);
    } catch (error) {
        const err = error as Error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during range question updating' });
    }
};

// Reorder question
export const createReorderQuestion = async (req: Request, res: Response): Promise<void> => {
    const { quizId, text, options, videos } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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
    const { quizId, text, options, videos } = req.body as {
        quizId: string;
        text: string;
        options: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;
    const { id } = req.params;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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
    const { quizId, text, correctLatitude, correctLongitude, videos } = req.body as {
        quizId: string;
        text: string;
        correctLatitude: string;
        correctLongitude: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'LOCATION' as QuestionType,
            correctLatitude: parseFloat(correctLatitude),
            correctLongitude: parseFloat(correctLongitude),
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
    const { quizId, text, correctLatitude, correctLongitude, videos } = req.body as {
        quizId: string;
        text: string;
        correctLatitude: string;
        correctLongitude: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;
    const { id } = req.params;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
        );

        const questionData: QuestionData = {
            quizId: parseInt(quizId),
            text,
            type: 'LOCATION' as QuestionType,
            correctLatitude: parseFloat(correctLatitude),
            correctLongitude: parseFloat(correctLongitude),
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
    const { quizId, text, correctAnswer, videos } = req.body as {
        quizId: string;
        text: string;
        correctAnswer: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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
    const { quizId, text, correctAnswer, videos } = req.body as {
        quizId: string;
        text: string;
        correctAnswer: string;
        videos?: string;
    };
    const files = req.files as Express.Multer.File[] | undefined;
    const { id } = req.params;

    try {
        const questionMedia = await uploadMedia(
            files ? files : null,
            videos ? JSON.parse(videos) as VideoInput : null
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
