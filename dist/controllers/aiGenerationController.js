import prisma from '../prismaClient.js';
import { AIGenerationStatus, AIQuestionStatus } from '@prisma/client';
import { generateQuestions, regenerateQuestion, extractPdfText } from '../services/aiService.js';
import { createQuestion as createQuestionService } from '../services/questionService.js';
import { trackUsage, checkLimit } from '../services/usageService.js';
import { FeatureKey } from '@prisma/client';
// Create AI generation job + trigger AI generation
export const createJob = async (req, res) => {
    try {
        const { instruction, targetQuizId, questionCount, questionTypes } = req.body;
        const userId = req.userId;
        const pdfFile = req.file;
        if (!instruction && !pdfFile) {
            res.status(400).json({ message: 'Either instruction or PDF file is required' });
            return;
        }
        // Parse question types
        let types = ['BUTTONS'];
        if (questionTypes) {
            try {
                types = JSON.parse(questionTypes);
            }
            catch {
                types = [questionTypes];
            }
        }
        const count = questionCount ? Number(questionCount) : 10;
        // Extract PDF text if uploaded
        let pdfText = null;
        if (pdfFile) {
            try {
                pdfText = await extractPdfText(pdfFile.buffer);
            }
            catch (err) {
                res.status(400).json({ message: 'Failed to parse PDF file' });
                return;
            }
        }
        // Check plan limits
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức hoặc có gói cá nhân để sử dụng tính năng này.' });
            return;
        }
        const { allowed, limit, current } = await checkLimit(orgId, 'ai_generations', FeatureKey.AI_GENERATION);
        if (!allowed) {
            res.status(403).json({
                message: `Bạn đã đạt giới hạn tạo AI cho giai đoạn này (${current}/${limit}). Vui lòng nâng cấp gói dịch vụ để tiếp tục.`
            });
            return;
        }
        // Create job record
        const job = await prisma.aIGenerationJob.create({
            data: {
                instruction: instruction || null,
                pdfUrl: pdfFile ? pdfFile.originalname : null,
                targetQuizId: targetQuizId ? Number(targetQuizId) : null,
                questionCount: count,
                userId: Number(userId),
                organizationId: req.organizationId ?? null,
                status: AIGenerationStatus.PROCESSING,
            },
        });
        // Generate questions with AI
        try {
            const generatedQuestions = await generateQuestions(instruction || null, pdfText, count, types);
            // Save generated questions
            await prisma.aIGeneratedQuestion.createMany({
                data: generatedQuestions.map(q => ({
                    jobId: job.id,
                    questionText: q.questionText,
                    questionType: q.questionType,
                    optionsData: q.optionsData,
                    status: AIQuestionStatus.PENDING,
                })),
            });
            // Update job status
            await prisma.aIGenerationJob.update({
                where: { id: job.id },
                data: { status: AIGenerationStatus.COMPLETED },
            });
            // Track usage after successful generation
            if (orgId) {
                await trackUsage(orgId, 'ai_generations', 1);
            }
            // Return job with generated questions
            const completeJob = await prisma.aIGenerationJob.findUnique({
                where: { id: job.id },
                include: {
                    generatedQuestions: { orderBy: { createdAt: 'asc' } },
                    targetQuiz: { select: { id: true, title: true } },
                },
            });
            res.status(201).json(completeJob);
        }
        catch (aiError) {
            console.error('[AI Generation Error]:', aiError);
            // Update job status to failed
            await prisma.aIGenerationJob.update({
                where: { id: job.id },
                data: {
                    status: AIGenerationStatus.FAILED,
                    errorMessage: aiError.message,
                },
            });
            res.status(500).json({
                message: 'AI generation failed',
                error: aiError.message,
                jobId: job.id,
            });
        }
    }
    catch (err) {
        console.error('[createJob Error]:', err);
        res.status(500).json(err);
    }
};
// Get user's AI jobs
export const getJobs = async (req, res) => {
    try {
        const userId = req.userId;
        const jobs = await prisma.aIGenerationJob.findMany({
            where: { userId: Number(userId) },
            include: {
                targetQuiz: { select: { id: true, title: true } },
                _count: {
                    select: { generatedQuestions: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        res.status(200).json(jobs);
    }
    catch (err) {
        console.error('[getJobs Error]:', err);
        res.status(500).json(err);
    }
};
// Get single job with generated questions
export const getJob = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const job = await prisma.aIGenerationJob.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId),
            },
            include: {
                targetQuiz: { select: { id: true, title: true } },
                generatedQuestions: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        finalQuestion: { select: { id: true, text: true } },
                    },
                },
            },
        });
        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        res.status(200).json(job);
    }
    catch (err) {
        console.error('[getJob Error]:', err);
        res.status(500).json(err);
    }
};
// Update generated question status (approve/reject)
export const updateGeneratedQuestion = async (req, res) => {
    try {
        const { id, questionId } = req.params;
        const { status, userFeedback } = req.body;
        const userId = req.userId;
        // Verify job belongs to user
        const job = await prisma.aIGenerationJob.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId),
            },
        });
        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        const updateData = { status };
        if (userFeedback) {
            updateData.userFeedback = userFeedback;
        }
        const question = await prisma.aIGeneratedQuestion.update({
            where: { id: Number(questionId) },
            data: updateData,
        });
        res.status(200).json(question);
    }
    catch (err) {
        console.error('[updateGeneratedQuestion Error]:', err);
        res.status(500).json(err);
    }
};
// Regenerate a single question using AI
export const regenerateGeneratedQuestion = async (req, res) => {
    try {
        const { id, questionId } = req.params;
        const { userFeedback } = req.body;
        const userId = req.userId;
        // Get the job and question
        const job = await prisma.aIGenerationJob.findFirst({
            where: { id: Number(id), userId: Number(userId) },
        });
        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        const existingQuestion = await prisma.aIGeneratedQuestion.findUnique({
            where: { id: Number(questionId) },
        });
        if (!existingQuestion) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }
        // Mark as regenerating
        await prisma.aIGeneratedQuestion.update({
            where: { id: Number(questionId) },
            data: {
                status: AIQuestionStatus.REGENERATING,
                regenerationCount: { increment: 1 },
            },
        });
        // Call AI to regenerate
        const newQuestion = await regenerateQuestion({
            questionText: existingQuestion.questionText,
            questionType: existingQuestion.questionType,
            optionsData: existingQuestion.optionsData,
        }, userFeedback || null, job.instruction);
        // Update with new content
        const updated = await prisma.aIGeneratedQuestion.update({
            where: { id: Number(questionId) },
            data: {
                questionText: newQuestion.questionText,
                questionType: newQuestion.questionType,
                optionsData: newQuestion.optionsData,
                status: AIQuestionStatus.PENDING,
                userFeedback: userFeedback || null,
            },
        });
        res.status(200).json(updated);
    }
    catch (err) {
        console.error('[regenerateGeneratedQuestion Error]:', err);
        res.status(500).json({ message: 'Regeneration failed', error: err.message });
    }
};
// Update generated question content (inline edit)
export const updateGeneratedQuestionContent = async (req, res) => {
    try {
        const { id, questionId } = req.params;
        const { questionText, questionType, optionsData } = req.body;
        const userId = req.userId;
        // Verify job belongs to user
        const job = await prisma.aIGenerationJob.findFirst({
            where: { id: Number(id), userId: Number(userId) },
        });
        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        const updateData = {};
        if (questionText !== undefined)
            updateData.questionText = questionText;
        if (questionType !== undefined)
            updateData.questionType = questionType;
        if (optionsData !== undefined)
            updateData.optionsData = optionsData;
        const updated = await prisma.aIGeneratedQuestion.update({
            where: { id: Number(questionId) },
            data: updateData,
        });
        res.status(200).json(updated);
    }
    catch (err) {
        console.error('[updateGeneratedQuestionContent Error]:', err);
        res.status(500).json(err);
    }
};
// Delete a generated question
export const deleteGeneratedQuestion = async (req, res) => {
    try {
        const { id, questionId } = req.params;
        const userId = req.userId;
        const job = await prisma.aIGenerationJob.findFirst({
            where: { id: Number(id), userId: Number(userId) },
        });
        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        await prisma.aIGeneratedQuestion.delete({
            where: { id: Number(questionId) },
        });
        res.status(200).json({ message: 'Question deleted' });
    }
    catch (err) {
        console.error('[deleteGeneratedQuestion Error]:', err);
        res.status(500).json(err);
    }
};
// Approve all and create quiz
export const approveAllAndCreateQuiz = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, categoryId } = req.body;
        const userId = req.userId;
        // Get job with questions
        const job = await prisma.aIGenerationJob.findFirst({
            where: { id: Number(id), userId: Number(userId) },
            include: {
                generatedQuestions: {
                    where: {
                        status: { in: [AIQuestionStatus.PENDING, AIQuestionStatus.APPROVED] },
                    },
                },
            },
        });
        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        if (job.generatedQuestions.length === 0) {
            res.status(400).json({ message: 'No questions to add to quiz' });
            return;
        }
        // Create quiz
        const quiz = await prisma.quiz.create({
            data: {
                title,
                description,
                creatorId: Number(userId),
                categoryId: Number(categoryId),
                isPublic: false,
            },
        });
        // Create actual questions from AI generated data
        for (const genQ of job.generatedQuestions) {
            const optData = genQ.optionsData;
            const questionData = {
                quizId: quiz.id,
                text: genQ.questionText,
                type: genQ.questionType,
            };
            // Map optionsData to questionData based on type
            if (genQ.questionType === 'BUTTONS' || genQ.questionType === 'CHECKBOXES') {
                const options = optData.options || [];
                questionData.options = options.map(o => ({
                    text: o.text,
                    // Handle string "true"/"false" from AI
                    isCorrect: o.isCorrect === true || String(o.isCorrect) === 'true',
                }));
                // Fallback: if no correct answer marked by AI, mark the first one
                if (questionData.options.length > 0 && !questionData.options.some(o => o.isCorrect)) {
                    questionData.options[0].isCorrect = true;
                }
            }
            else if (genQ.questionType === 'REORDER') {
                const options = optData.options || [];
                questionData.options = options.map((o, idx) => ({
                    text: o.text,
                    order: o.order || (idx + 1),
                }));
            }
            else if (genQ.questionType === 'TYPEANSWER') {
                questionData.correctAnswer = optData.correctAnswer || optData.answer || '';
            }
            const createdQ = await createQuestionService(questionData);
            // Update generated question with final reference
            await prisma.aIGeneratedQuestion.update({
                where: { id: genQ.id },
                data: {
                    status: AIQuestionStatus.APPROVED,
                    finalQuestionId: createdQ.id,
                },
            });
        }
        // Update job status
        await prisma.aIGenerationJob.update({
            where: { id: job.id },
            data: { status: AIGenerationStatus.APPROVED, targetQuizId: quiz.id },
        });
        // Return quiz with questions
        const completeQuiz = await prisma.quiz.findUnique({
            where: { id: quiz.id },
            include: {
                questions: { include: { options: true } },
                category: true,
            },
        });
        res.status(201).json(completeQuiz);
    }
    catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};
// Update job status
export const updateJobStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const job = await prisma.aIGenerationJob.update({
            where: { id: Number(id) },
            data: { status },
        });
        res.status(200).json(job);
    }
    catch (err) {
        console.error('[updateJobStatus Error]:', err);
        res.status(500).json(err);
    }
};
// Delete AI job
export const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const job = await prisma.aIGenerationJob.findFirst({
            where: {
                id: Number(id),
                userId: Number(userId),
            },
        });
        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }
        await prisma.aIGenerationJob.delete({
            where: { id: Number(id) },
        });
        res.status(200).json({ message: 'Job deleted successfully' });
    }
    catch (err) {
        console.error('[deleteJob Error]:', err);
        res.status(500).json(err);
    }
};
