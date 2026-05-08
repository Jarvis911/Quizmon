import { OrganizationRole } from '@prisma/client';
import { createQuestion as createQuestionService, updateQuestion as updateQuestionService, } from '../services/questionService.js';
import { uploadMedia } from '../services/uploadMediaService.js';
import prisma from '../prismaClient.js';
const QUIZ_MANAGER_ROLES = [
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.TEACHER,
];
/**
 * Returns true when `userId` may create/edit questions inside `quizId`.
 * Rules mirror the quiz-level edit policy:
 *   - quiz creator always allowed
 *   - org member with OWNER/ADMIN/TEACHER role allowed if quiz belongs to same org
 */
async function canEditQuiz(quizId, userId, orgId) {
    const quiz = await prisma.quiz.findUnique({
        where: { id: quizId },
        select: { creatorId: true, organizationId: true },
    });
    if (!quiz)
        return false;
    if (quiz.creatorId === userId)
        return true;
    if (orgId !== undefined && quiz.organizationId === orgId) {
        const membership = await prisma.organizationMember.findUnique({
            where: { organizationId_userId: { organizationId: orgId, userId } },
            select: { role: true },
        });
        return membership !== null && QUIZ_MANAGER_ROLES.includes(membership.role);
    }
    return false;
}
/** multipart/form-data sends `options` as a JSON string; `application/json` sends an array. */
function parseQuestionOptionsFromBody(options) {
    if (options == null) {
        throw new Error('Missing options');
    }
    if (Array.isArray(options)) {
        return options;
    }
    if (typeof options === 'string') {
        return JSON.parse(options);
    }
    throw new Error('options must be a JSON string or array');
}
// Get retrieve question
export const getRetrieveQuestion = async (req, res) => {
    const { id } = req.params;
    try {
        const question = await prisma.question.findUnique({
            where: { id: Number(id) },
            include: {
                media: true,
                options: true,
                quiz: {
                    select: { id: true, title: true, isPublic: true, creatorId: true, organizationId: true },
                },
            },
        });
        if (!question) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        // Enforce the same access rule as GET /quiz/:id
        const { isPublic, creatorId, organizationId } = question.quiz;
        const userId = req.userId;
        const orgId = req.organizationId;
        const canRead = isPublic ||
            (userId !== undefined && creatorId === Number(userId)) ||
            (orgId !== undefined && organizationId === orgId);
        if (!canRead) {
            res.status(403).json({ message: 'You do not have permission to view this question' });
            return;
        }
        res.status(200).json(question);
    }
    catch (err) {
        res.status(500).json({ message: 'Server error during getting the question' });
    }
};
// Button question
export const createButtonQuestion = async (req, res) => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    try {
        if (!await canEditQuiz(parseInt(quizId), Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to add questions to this quiz' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'BUTTONS',
            media: questionMedia,
            options: parseQuestionOptionsFromBody(options),
        };
        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during button question creation' });
    }
};
export const updateButtonQuestion = async (req, res) => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body;
    const { id } = req.params;
    const files = req.files;
    try {
        const existing = await prisma.question.findUnique({ where: { id: Number(id) }, select: { quizId: true } });
        if (!existing) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        if (!await canEditQuiz(existing.quizId, Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to edit this question' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'BUTTONS',
            media: questionMedia,
            options: parseQuestionOptionsFromBody(options),
        };
        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during button question updating' });
    }
};
// Checkbox question
export const createCheckboxQuestion = async (req, res) => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    try {
        if (!await canEditQuiz(Number(quizId), Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to add questions to this quiz' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: Number(quizId),
            text,
            type: 'CHECKBOXES',
            media: questionMedia,
            options: parseQuestionOptionsFromBody(options),
        };
        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during checkbox question creation' });
    }
};
export const updateCheckboxQuestion = async (req, res) => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body;
    const { id } = req.params;
    const files = req.files;
    try {
        const existing = await prisma.question.findUnique({ where: { id: Number(id) }, select: { quizId: true } });
        if (!existing) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        if (!await canEditQuiz(existing.quizId, Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to edit this question' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'CHECKBOXES',
            media: questionMedia,
            options: parseQuestionOptionsFromBody(options),
        };
        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during checkbox question updating' });
    }
};
// Reorder question
export const createReorderQuestion = async (req, res) => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    try {
        if (!await canEditQuiz(parseInt(quizId), Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to add questions to this quiz' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'REORDER',
            media: questionMedia,
            options: parseQuestionOptionsFromBody(options),
        };
        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during reorder question creation' });
    }
};
export const updateReorderQuestion = async (req, res) => {
    const { quizId, text, options, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    const { id } = req.params;
    try {
        const existing = await prisma.question.findUnique({ where: { id: Number(id) }, select: { quizId: true } });
        if (!existing) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        if (!await canEditQuiz(existing.quizId, Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to edit this question' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'REORDER',
            media: questionMedia,
            options: parseQuestionOptionsFromBody(options),
        };
        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during reorder question updating' });
    }
};
// Location question
export const createLocationQuestion = async (req, res) => {
    const { quizId, text, correctLatitude, correctLongitude, optionsData, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    try {
        if (!await canEditQuiz(parseInt(quizId), Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to add questions to this quiz' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        let parsedOptionsData = {};
        try {
            if (optionsData)
                parsedOptionsData = typeof optionsData === 'string' ? JSON.parse(optionsData) : optionsData;
        }
        catch (e) { }
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'LOCATION',
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
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during location question creation' });
    }
};
export const updateLocationQuestion = async (req, res) => {
    const { quizId, text, correctLatitude, correctLongitude, optionsData, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    const { id } = req.params;
    try {
        const existing = await prisma.question.findUnique({ where: { id: Number(id) }, select: { quizId: true } });
        if (!existing) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        if (!await canEditQuiz(existing.quizId, Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to edit this question' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        let parsedOptionsData = {};
        try {
            if (optionsData)
                parsedOptionsData = typeof optionsData === 'string' ? JSON.parse(optionsData) : optionsData;
        }
        catch (e) { }
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'LOCATION',
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
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during location question updating' });
    }
};
// Type answer question
export const createTypeAnswerQuestion = async (req, res) => {
    const { quizId, text, correctAnswer, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    try {
        if (!await canEditQuiz(parseInt(quizId), Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to add questions to this quiz' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'TYPEANSWER',
            correctAnswer,
            media: questionMedia,
        };
        const newQuestion = await createQuestionService(questionData);
        res.status(201).json(newQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during type answer question creation' });
    }
};
export const updateTypeAnswerQuestion = async (req, res) => {
    const { quizId, text, correctAnswer, videos, imageEffect, zoomX, zoomY } = req.body;
    const files = req.files;
    const { id } = req.params;
    try {
        const existing = await prisma.question.findUnique({ where: { id: Number(id) }, select: { quizId: true } });
        if (!existing) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        if (!await canEditQuiz(existing.quizId, Number(req.userId), req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to edit this question' });
            return;
        }
        const questionMedia = await uploadMedia(files ? files : null, videos ? JSON.parse(videos) : null, imageEffect, zoomX ? parseFloat(zoomX) : undefined, zoomY ? parseFloat(zoomY) : undefined);
        const questionData = {
            quizId: parseInt(quizId),
            text,
            type: 'TYPEANSWER',
            correctAnswer,
            media: questionMedia,
        };
        const updatedQuestion = await updateQuestionService(Number(id), questionData);
        res.status(200).json(updatedQuestion);
    }
    catch (error) {
        const err = error;
        console.error(err.message);
        res.status(500).json({ message: 'Server error during type answer question updating' });
    }
};
export const deleteQuestion = async (req, res) => {
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
        // Ownership check: creator always allowed; org members need OWNER/ADMIN/TEACHER role
        if (question.quiz.creatorId !== userId) {
            const isManager = req.organizationId &&
                question.quiz.organizationId === req.organizationId &&
                await canEditQuiz(question.quizId, userId, req.organizationId);
            if (!isManager) {
                res.status(403).json({ message: 'You do not have permission to delete this question' });
                return;
            }
        }
        await prisma.$transaction(async (tx) => {
            const qid = Number(id);
            await tx.questionOption.deleteMany({ where: { questionId: qid } });
            await tx.questionMedia.deleteMany({ where: { questionId: qid } });
            await tx.question.delete({ where: { id: qid } });
        });
        res.status(200).json({ message: 'Question deleted successfully' });
    }
    catch (err) {
        const error = err;
        console.error('Delete Question Error:', error);
        res.status(500).json({ message: error.message });
    }
};
