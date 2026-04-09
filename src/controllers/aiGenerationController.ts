import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { notificationService } from '../services/notificationService.js';
import { AIGenerationStatus, AIQuestionStatus, QuestionType, Prisma } from '@prisma/client';
import { generateQuestions, regenerateQuestion, extractPdfText, ImagePart } from '../services/aiService.js';
import { createQuestion as createQuestionService, QuestionData } from '../services/questionService.js';
import { trackUsage, checkLimit } from '../services/usageService.js';
import { FeatureKey } from '@prisma/client';

interface CreateJobBody {
    instruction?: string;
    targetQuizId?: number;
    questionCount?: number;
    questionTypes?: string; // JSON string array of QuestionType
}

interface UpdateQuestionBody {
    status: AIQuestionStatus;
    userFeedback?: string;
}

// Create AI generation job + trigger AI generation
export const createJob = async (req: Request, res: Response): Promise<void> => {
    try {
        const { instruction, targetQuizId, questionCount, questionTypes } = req.body as CreateJobBody;
        const userId = req.userId;
        const multerFiles = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
        const pdfFile = multerFiles?.pdfFile?.[0];
        const imageFiles = multerFiles?.imageFiles ?? [];

        if (!instruction && !pdfFile && imageFiles.length === 0) {
            res.status(400).json({ message: 'Instruction, PDF file, or at least one image is required' });
            return;
        }

        // Parse question types
        let types: QuestionType[] = ['BUTTONS'];
        if (questionTypes) {
            try {
                types = JSON.parse(questionTypes) as QuestionType[];
            } catch {
                types = [questionTypes as QuestionType];
            }
        }

        const count = questionCount ? Number(questionCount) : 10;

        // Extract PDF text if uploaded
        let pdfText: string | null = null;
        if (pdfFile) {
            try {
                pdfText = await extractPdfText(pdfFile.buffer);
            } catch (err) {
                res.status(400).json({ message: 'Failed to parse PDF file' });
                return;
            }
        }

        // Prepare image parts for Gemini
        const imageParts: ImagePart[] = imageFiles.map(file => ({
            inlineData: {
                data: file.buffer.toString('base64'),
                mimeType: file.mimetype
            }
        }));

        // Check plan limits
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(403).json({ message: 'Bạn cần tham gia một tổ chức hoặc có gói cá nhân để sử dụng tính năng này.' });
            return;
        }

        const { allowed, limit, current } = await checkLimit(
            orgId,
            'ai_generations',
            FeatureKey.AI_GENERATION
        );

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
                imageUrls: imageFiles.map(f => f.originalname),
                targetQuizId: targetQuizId ? Number(targetQuizId) : null,
                questionCount: count,
                userId: Number(userId),
                organizationId: req.organizationId ?? null,
                status: AIGenerationStatus.PROCESSING,
            },
        });

        // Generate questions with AI
        try {
            const generationResult = await generateQuestions(
                instruction || null,
                pdfText,
                imageParts.length > 0 ? imageParts : null,
                count,
                types
            );

            // Try to match suggested category to an existing one
            let suggestedCategoryId: number | undefined;
            const matchedCategory = await prisma.quizCategory.findFirst({
                where: { name: { contains: generationResult.suggestedCategory, mode: 'insensitive' } }
            });
            if (matchedCategory) {
                suggestedCategoryId = matchedCategory.id;
            }

            // Save generated questions
            await prisma.aIGeneratedQuestion.createMany({
                data: generationResult.questions
                    .map(q => ({
                        jobId: job.id,
                        questionText: q.questionText,
                        questionType: q.questionType,
                        optionsData: q.optionsData as Prisma.InputJsonValue,
                        status: AIQuestionStatus.PENDING,
                    })),
            });

            // Update job status
            await prisma.aIGenerationJob.update({
                where: { id: job.id },
                data: { 
                    status: AIGenerationStatus.COMPLETED,
                    suggestedTitle: generationResult.suggestedTitle,
                    suggestedDescription: generationResult.suggestedDescription,
                    suggestedCategoryId: suggestedCategoryId || null,
                    totalTokens: generationResult.tokenUsage,
                },
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
            
            // Send success notification
            await notificationService.createNotification(
                Number(userId),
                `AI đã tạo xong câu hỏi cho bạn. Hãy vào kiểm tra nhé!`,
                'AI_GENERATION_COMPLETED',
                `/ai-generation/jobs/${job.id}`
            );

            res.status(201).json(completeJob);
        } catch (aiError) {
            console.error('[AI Generation Error]:', aiError);

            // Update job status to failed
            await prisma.aIGenerationJob.update({
                where: { id: job.id },
                data: {
                    status: AIGenerationStatus.FAILED,
                    errorMessage: (aiError as Error).message,
                },
            });

            // Send failure notification
            await notificationService.createNotification(
                Number(userId),
                `Tạo câu hỏi bằng AI thất bại: ${(aiError as Error).message}`,
                'AI_GENERATION_FAILED',
                `/ai-generation/jobs/${job.id}`
            );

            res.status(500).json({
                message: 'AI generation failed',
                error: (aiError as Error).message,
                jobId: job.id,
            });
        }
    } catch (err) {
        console.error('[createJob Error]:', err);
        res.status(500).json(err);
    }
};

// Get user's AI jobs
export const getJobs = async (req: Request, res: Response): Promise<void> => {
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
    } catch (err) {
        console.error('[getJobs Error]:', err);
        res.status(500).json(err);
    }
};

// Get single job with generated questions
export const getJob = async (req: Request, res: Response): Promise<void> => {
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
    } catch (err) {
        console.error('[getJob Error]:', err);
        res.status(500).json(err);
    }
};

// Update generated question status (approve/reject)
export const updateGeneratedQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, questionId } = req.params;
        const { status, userFeedback } = req.body as UpdateQuestionBody;
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

        const updateData: Prisma.AIGeneratedQuestionUpdateInput = { status };

        if (userFeedback) {
            updateData.userFeedback = userFeedback;
        }

        const question = await prisma.aIGeneratedQuestion.update({
            where: { id: Number(questionId) },
            data: updateData,
        });

        res.status(200).json(question);
    } catch (err) {
        console.error('[updateGeneratedQuestion Error]:', err);
        res.status(500).json(err);
    }
};

// Regenerate a single question using AI
export const regenerateGeneratedQuestion = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, questionId } = req.params;
        const { userFeedback } = req.body as { userFeedback?: string };
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
        const newQuestion = await regenerateQuestion(
            {
                questionText: existingQuestion.questionText,
                questionType: existingQuestion.questionType,
                optionsData: existingQuestion.optionsData,
            },
            userFeedback || null,
            job.instruction
        );

        // Update with new content and increment tokens
        const updated = await prisma.aIGeneratedQuestion.update({
            where: { id: Number(questionId) },
            data: {
                questionText: newQuestion.questionText,
                questionType: newQuestion.questionType,
                optionsData: newQuestion.optionsData as Prisma.InputJsonValue,
                status: AIQuestionStatus.PENDING,
                userFeedback: userFeedback || null,
            },
        });

        // Accumulate tokens in the job
        if (newQuestion.tokenUsage) {
            await prisma.aIGenerationJob.update({
                where: { id: job.id },
                data: {
                    totalTokens: { increment: newQuestion.tokenUsage }
                }
            });
        }

        res.status(200).json(updated);
    } catch (err) {
        console.error('[regenerateGeneratedQuestion Error]:', err);
        res.status(500).json({ message: 'Regeneration failed', error: (err as Error).message });
    }
};

// Update generated question content (inline edit)
export const updateGeneratedQuestionContent = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id, questionId } = req.params;
        const { questionText, questionType, optionsData } = req.body as {
            questionText?: string;
            questionType?: QuestionType;
            optionsData?: Prisma.InputJsonValue;
        };
        const userId = req.userId;

        // Verify job belongs to user
        const job = await prisma.aIGenerationJob.findFirst({
            where: { id: Number(id), userId: Number(userId) },
        });

        if (!job) {
            res.status(404).json({ message: 'Job not found' });
            return;
        }

        const updateData: Prisma.AIGeneratedQuestionUpdateInput = {};
        if (questionText !== undefined) updateData.questionText = questionText;
        if (questionType !== undefined) updateData.questionType = questionType;
        if (optionsData !== undefined) updateData.optionsData = optionsData;

        const updated = await prisma.aIGeneratedQuestion.update({
            where: { id: Number(questionId) },
            data: updateData,
        });

        res.status(200).json(updated);
    } catch (err) {
        console.error('[updateGeneratedQuestionContent Error]:', err);
        res.status(500).json(err);
    }
};

// Delete a generated question
export const deleteGeneratedQuestion = async (req: Request, res: Response): Promise<void> => {
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
    } catch (err) {
        console.error('[deleteGeneratedQuestion Error]:', err);
        res.status(500).json(err);
    }
};

// Approve all and create quiz
export const approveAllAndCreateQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title, description, categoryId } = req.body as {
            title: string;
            description: string;
            categoryId: number;
        };
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
                organizationId: req.organizationId ?? null,
                isPublic: false,
            },
        });

        // Create actual questions from AI generated data
        for (const genQ of job.generatedQuestions) {
            const optData = genQ.optionsData as Record<string, unknown>;

            const questionData: QuestionData = {
                quizId: quiz.id,
                text: genQ.questionText,
                type: genQ.questionType,
            };

            // Map optionsData to questionData based on type
            if (genQ.questionType === 'BUTTONS' || genQ.questionType === 'CHECKBOXES') {
                const options = (optData.options as Array<{ text: string; isCorrect?: any }>) || [];
                questionData.options = options.map(o => ({
                    text: o.text,
                    // Handle string "true"/"false" from AI
                    isCorrect: o.isCorrect === true || String(o.isCorrect) === 'true',
                }));

                // Fallback: if no correct answer marked by AI, mark the first one
                if (questionData.options.length > 0 && !questionData.options.some(o => o.isCorrect)) {
                    questionData.options[0].isCorrect = true;
                }
            } else if (genQ.questionType === 'REORDER') {
                const options = (optData.options as Array<{ text: string; order?: number }>) || [];
                questionData.options = options.map((o, idx) => ({
                    text: o.text,
                    order: o.order || (idx + 1),
                }));
            } else if (genQ.questionType === 'TYPEANSWER') {
                questionData.correctAnswer = (optData.correctAnswer as string) || (optData.answer as string) || '';
            } else if (genQ.questionType === 'LOCATION') {
                questionData.correctLatitude = Number(optData.correctLatitude);
                questionData.correctLongitude = Number(optData.correctLongitude);
                if ('radius1000' in optData) questionData.radius1000 = Number(optData.radius1000);
                if ('radius750' in optData) questionData.radius750 = Number(optData.radius750);
                if ('radius500' in optData) questionData.radius500 = Number(optData.radius500);
                if ('mapType' in optData) questionData.mapType = String(optData.mapType);
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

        // Send notification
        await notificationService.createNotification(
            Number(userId),
            `Bộ câu hỏi AI "${quiz.title}" đã được thêm vào thư viện của bạn.`,
            'AI_QUIZ_APPROVED',
            `/library/${quiz.id}`
        );

        // Return quiz with questions
        const completeQuiz = await prisma.quiz.findUnique({
            where: { id: quiz.id },
            include: {
                questions: { include: { options: true } },
                category: true,
            },
        });

        res.status(201).json(completeQuiz);
    } catch (err) {
        console.error(err);
        res.status(500).json(err);
    }
};

// Update job status
export const updateJobStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body as { status: AIGenerationStatus };

        const job = await prisma.aIGenerationJob.update({
            where: { id: Number(id) },
            data: { status },
        });

        res.status(200).json(job);
    } catch (err) {
        console.error('[updateJobStatus Error]:', err);
        res.status(500).json(err);
    }
};

// Delete AI job
export const deleteJob = async (req: Request, res: Response): Promise<void> => {
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
    } catch (err) {
        console.error('[deleteJob Error]:', err);
        res.status(500).json(err);
    }
};

// Finalize and save quiz from agentic data
export const finalizeAgenticQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const { title, description, categoryId, questions } = req.body as {
            title: string;
            description: string;
            categoryId: number;
            questions: any[];
        };
        const userId = req.userId;

        // Create quiz
        const quiz = await prisma.quiz.create({
            data: {
                title,
                description: description || title,
                creatorId: Number(userId),
                categoryId: Number(categoryId),
                organizationId: req.organizationId ?? null,
                isPublic: false,
            },
        });

        // Create actual questions
        for (const genQ of questions) {
            const optData = genQ.optionsData as Record<string, unknown>;

            const questionData: QuestionData = {
                quizId: quiz.id,
                text: genQ.questionText,
                type: genQ.questionType,
            };

            if (genQ.questionType === 'BUTTONS' || genQ.questionType === 'CHECKBOXES') {
                const options = (optData.options as Array<{ text: string; isCorrect?: any }>) || [];
                questionData.options = options.map(o => ({
                    text: o.text,
                    isCorrect: o.isCorrect === true || String(o.isCorrect) === 'true',
                }));
                if (questionData.options.length > 0 && !questionData.options.some(o => o.isCorrect)) {
                    questionData.options[0].isCorrect = true;
                }
            } else if (genQ.questionType === 'REORDER') {
                const options = (optData.options as Array<{ text: string; order?: number }>) || [];
                questionData.options = options.map((o, idx) => ({
                    text: o.text,
                    order: o.order || (idx + 1),
                }));
            } else if (genQ.questionType === 'TYPEANSWER') {
                questionData.correctAnswer = (optData.correctAnswer as string) || (optData.answer as string) || '';
            } else if (genQ.questionType === 'LOCATION') {
                questionData.correctLatitude = Number(optData.correctLatitude);
                questionData.correctLongitude = Number(optData.correctLongitude);
                if ('radius1000' in optData) questionData.radius1000 = Number(optData.radius1000);
                if ('radius750' in optData) questionData.radius750 = Number(optData.radius750);
                if ('radius500' in optData) questionData.radius500 = Number(optData.radius500);
                if ('mapType' in optData) questionData.mapType = String(optData.mapType);
            }

            await createQuestionService(questionData);
        }

        res.status(201).json(quiz);
    } catch (err) {
        console.error('[finalizeAgenticQuiz Error]:', err);
        res.status(500).json(err);
    }
};

// Get all chat sessions for user
export const getAgentChatSessions = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.userId;
        const sessions = await prisma.agentChatSession.findMany({
            where: { userId: Number(userId) },
            orderBy: { updatedAt: 'desc' },
        });
        res.status(200).json(sessions);
    } catch (err) {
        console.error('[getAgentChatSessions Error]:', err);
        res.status(500).json(err);
    }
};

// Get single chat session with messages
export const getAgentChatSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const session = await prisma.agentChatSession.findFirst({
            where: { id: Number(id), userId: Number(userId) },
            include: {
                messages: { orderBy: { createdAt: 'asc' } }
            }
        });

        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }

        res.status(200).json(session);
    } catch (err) {
        console.error('[getAgentChatSession Error]:', err);
        res.status(500).json(err);
    }
};

// Delete chat session
export const deleteAgentChatSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        await prisma.agentChatSession.deleteMany({
            where: { id: Number(id), userId: Number(userId) }
        });
        res.status(200).json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('[deleteAgentChatSession Error]:', err);
        res.status(500).json(err);
    }
};

// Rename chat session
export const renameAgentChatSession = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { title } = req.body as { title: string };
        const userId = req.userId;
        const session = await prisma.agentChatSession.updateMany({
            where: { id: Number(id), userId: Number(userId) },
            data: { title }
        });

        if (session.count === 0) {
            res.status(404).json({ message: 'Session not found or not owned by user' });
            return;
        }

        res.status(200).json({ message: 'Session renamed successfully' });
    } catch (err) {
        console.error('[renameAgentChatSession Error]:', err);
        res.status(500).json(err);
    }
};
