import { Request, Response } from 'express';
import { uploadBufferToAzure } from '../services/azureBlobService.js';
import prisma from '../prismaClient.js';
import { deleteQuizCascade } from '../services/deleteQuizCascade.js';
import { notificationService } from '../services/notificationService.js';
import { OrganizationRole } from '@prisma/client';

const QUIZ_MANAGER_ROLES: OrganizationRole[] = [
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.TEACHER,
];

interface CreateQuizBody {
    title: string;
    description: string;
    isPublic?: boolean;
    categoryId: string | number;
}

interface QuizAccessScope {
    isPublic: boolean;
    creatorId: number;
    organizationId: number | null;
}

const canReadQuiz = (quiz: QuizAccessScope, userId?: number, organizationId?: number): boolean => {
    return (
        quiz.isPublic ||
        (userId !== undefined && quiz.creatorId === Number(userId)) ||
        (organizationId !== undefined && quiz.organizationId === organizationId)
    );
};

export const createQuiz = async (req: Request, res: Response): Promise<void> => {
    const { title, description, isPublic, categoryId, imageUrl: directImageUrl } = req.body as CreateQuizBody & { imageUrl?: string };
    const imageFile = req.file;
    let imageUrl: string | null = null;
    const creatorId = req.userId;

    try {
        if (imageFile) {
            imageUrl = await uploadBufferToAzure(imageFile.buffer, imageFile.originalname, imageFile.mimetype);
        } else if (typeof directImageUrl === 'string' && directImageUrl.startsWith('http')) {
            imageUrl = directImageUrl;
        }

        const data = await prisma.quiz.create({
            data: {
                title,
                description,
                image: imageUrl,
                isPublic: !!isPublic,
                creatorId: Number(creatorId),
                categoryId: Number(categoryId),
                organizationId: req.organizationId ?? null,
            },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
                category: {
                    select: { id: true, name: true },
                },
            },
        });

        // Send notification
        await notificationService.createNotification(
            Number(creatorId),
            `Bạn đã tạo thành công bộ câu hỏi: ${data.title}`,
            'QUIZ_CREATED',
            `/library/${data.id}`
        );

        res.status(201).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getQuiz = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await prisma.quiz.findMany({
            where: {
                creatorId: Number(req.userId),
                OR: [
                    { organizationId: req.organizationId ?? null },
                    { organizationId: null }
                ],
            },
            orderBy: { id: 'asc' },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
                category: {
                    select: { id: true, name: true },
                },
            },
        });

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const exploreQuizzes = async (req: Request, res: Response): Promise<void> => {
    try {
        const data = await prisma.quiz.findMany({
            where: {
                isPublic: true,
            },
            orderBy: { createdAt: 'desc' },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
                category: {
                    select: { id: true, name: true },
                },
                questions: {
                    select: { id: true }, // To calculate question amount
                },
            },
        });

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getRetrieveQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    try {
        const data = await prisma.quiz.findUnique({
            where: {
                id: Number(id),
            },
            include: {
                questions: {
                    orderBy: { id: 'asc' },
                    include: {
                        media: true,
                        options: true,
                    },
                },
                category: {
                    select: { id: true, name: true },
                },
                creator: {
                    select: { id: true, username: true },
                },
            },
        });

        if (!data) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (!canReadQuiz(data, req.userId, req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to view this quiz' });
            return;
        }

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const updateQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { title, description, isPublic, categoryId, removeImage, imageUrl: directImageUrl } = req.body;
    const imageFile = req.file;
    const userId = Number(req.userId);

    try {
        // Ownership check
        const existingQuiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: { creatorId: true, organizationId: true, lockedById: true, lockExpiresAt: true },
        });

        if (!existingQuiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (existingQuiz.creatorId !== userId) {
            // Non-creators need OWNER/ADMIN/TEACHER role in the quiz's org
            const canManage =
                req.organizationId &&
                existingQuiz.organizationId === req.organizationId &&
                await prisma.organizationMember.findFirst({
                    where: {
                        organizationId: req.organizationId,
                        userId,
                        role: { in: QUIZ_MANAGER_ROLES },
                    },
                });

            if (!canManage) {
                res.status(403).json({ message: 'You do not have permission to update this quiz' });
                return;
            }
        }

        // Checkout lock check (org quizzes only)
        if (existingQuiz.organizationId) {
            const now = new Date();
            if (
                existingQuiz.lockedById &&
                existingQuiz.lockedById !== userId &&
                existingQuiz.lockExpiresAt &&
                existingQuiz.lockExpiresAt > now
            ) {
                res.status(423).json({ message: 'Quiz đang được chỉnh sửa bởi người khác.' });
                return;
            }
        }

        let imageUrl: string | null | undefined = undefined;
        if (imageFile) {
            imageUrl = await uploadBufferToAzure(imageFile.buffer, imageFile.originalname, imageFile.mimetype);
        } else if (typeof directImageUrl === 'string' && directImageUrl.startsWith('http')) {
            // Direct URL (e.g. AI-generated image already on Azure)
            imageUrl = directImageUrl;
        } else if (removeImage === 'true' || removeImage === true) {
            imageUrl = null;
        }

        // Fix isPublic conversion (multipart/form-data sends boolean as strings)
        let publicValue: boolean | undefined = undefined;
        if (isPublic !== undefined) {
            publicValue = String(isPublic) === 'true';
        }

        const data = await prisma.quiz.update({
            where: {
                id: Number(id),
            },
            data: {
                title: title !== undefined ? title : undefined,
                description: description !== undefined ? description : undefined,
                ...(imageUrl !== undefined && { image: imageUrl }),
                isPublic: publicValue,
                categoryId: categoryId ? Number(categoryId) : undefined,
            },
            include: {
                creator: {
                    select: { id: true, username: true },
                },
                category: {
                    select: { id: true, name: true },
                },
            },
        });

        // Send notification
        await notificationService.createNotification(
            userId,
            `Bạn đã cập nhật bộ câu hỏi: ${data.title}`,
            'QUIZ_UPDATED',
            `/library/${data.id}`
        );

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        console.error('Update Quiz Error:', error);
        res.status(400).json({ message: error.message });
    }
};

export const getQuestionByQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: {
                isPublic: true,
                creatorId: true,
                organizationId: true,
            },
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (!canReadQuiz(quiz, req.userId, req.organizationId)) {
            res.status(403).json({ message: 'You do not have permission to view this quiz' });
            return;
        }

        const data = await prisma.question.findMany({
            where: {
                quizId: Number(id),
            },
            orderBy: { id: 'asc' },
            include: {
                media: true,
                options: true,
            },
        });

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

export const getQuizRating = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    try {
        const ratings = await prisma.quizRating.findMany({
            where: { quizId: Number(id) },
            select: {
                id: true,
                userId: true,
                rating: true,
                text: true,
            },
        });

        const avgScore =
            ratings.length > 0
                ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
                : 0;

        res.status(200).json({
            average: avgScore,
            count: ratings.length,
            ratings,
        });
    } catch (err) {
        const error = err as Error;
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

export const checkUserRateQuiz = async (req: Request, res: Response): Promise<void> => {
    const userId = req.userId;
    const { id } = req.params;

    try {
        const existingRating = await prisma.quizRating.findFirst({
            where: {
                userId: Number(userId),
                quizId: Number(id),
            },
        });

        res.status(200).json({ rated: !!existingRating });
    } catch (err) {
        const error = err as Error;
        console.error(error);
        res.status(500).json({ message: error.message });
    }
};

export const deleteQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: { creatorId: true, organizationId: true },
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (quiz.creatorId !== userId) {
            // Non-creators need OWNER/ADMIN/TEACHER role in the quiz's org
            const canManage =
                req.organizationId &&
                quiz.organizationId === req.organizationId &&
                await prisma.organizationMember.findFirst({
                    where: {
                        organizationId: req.organizationId,
                        userId,
                        role: { in: QUIZ_MANAGER_ROLES },
                    },
                });

            if (!canManage) {
                res.status(403).json({ message: 'You do not have permission to delete this quiz' });
                return;
            }
        }

        await deleteQuizCascade(Number(id));

        res.status(200).json({ message: 'Quiz deleted successfully' });
    } catch (err) {
        const error = err as Error;
        console.error('Delete Quiz Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Get quizzes belonging to the current organization (from all members)
export const getOrgQuizzes = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const data = await prisma.quiz.findMany({
            where: { organizationId: orgId },
            orderBy: { updatedAt: 'desc' },
            include: {
                creator: { select: { id: true, username: true } },
                category: { select: { id: true, name: true } },
                lockedBy: { select: { id: true, username: true } },
                _count: { select: { questions: true } }
            },
        });

        // Clear expired locks in the response
        const now = new Date();
        const cleaned = data.map(q => ({
            ...q,
            lockedById: q.lockExpiresAt && q.lockExpiresAt > now ? q.lockedById : null,
            lockedBy: q.lockExpiresAt && q.lockExpiresAt > now ? q.lockedBy : null,
            lockedAt: q.lockExpiresAt && q.lockExpiresAt > now ? q.lockedAt : null,
            lockExpiresAt: q.lockExpiresAt && q.lockExpiresAt > now ? q.lockExpiresAt : null,
        }));

        res.status(200).json(cleaned);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

// Replicate a public quiz into the current user's personal library
export const replicateQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);

    try {
        const original = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            include: {
                questions: {
                    include: { options: true, media: true }
                },
                category: true
            }
        });

        if (!original) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (!original.isPublic && original.creatorId !== userId) {
            res.status(403).json({ message: 'Quiz này không công khai.' });
            return;
        }

        const newQuiz = await prisma.quiz.create({
            data: {
                title: `${original.title} (bản sao)`,
                description: original.description,
                image: original.image,
                isPublic: false,
                creatorId: userId,
                categoryId: original.categoryId,
                organizationId: null, // Goes into personal library by default
                questions: {
                    create: original.questions.map(q => ({
                        text: q.text,
                        type: q.type,
                        data: q.data ?? undefined,
                        options: {
                            create: q.options.map(o => ({
                                text: o.text,
                                isCorrect: o.isCorrect,
                                order: o.order
                            }))
                        }
                    }))
                }
            },
            include: {
                creator: { select: { id: true, username: true } },
                category: { select: { id: true, name: true } }
            }
        });

        await notificationService.createNotification(
            userId,
            `Đã sao chép quiz "${original.title}" vào thư viện của bạn.`,
            'QUIZ_REPLICATED',
            `/library`
        );

        res.status(201).json(newQuiz);
    } catch (err) {
        const error = err as Error;
        console.error('Replicate Quiz Error:', error);
        res.status(500).json({ message: error.message });
    }
};

// Assign a quiz to the current organization
export const assignQuizToOrg = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);
    const orgId = req.organizationId;

    try {
        if (!orgId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: { creatorId: true, organizationId: true, title: true }
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (quiz.creatorId !== userId) {
            res.status(403).json({ message: 'Chỉ tác giả mới có thể đưa quiz vào tổ chức.' });
            return;
        }

        const updated = await prisma.quiz.update({
            where: { id: Number(id) },
            data: { organizationId: orgId },
            include: {
                creator: { select: { id: true, username: true } },
                category: { select: { id: true, name: true } }
            }
        });

        res.status(200).json(updated);
    } catch (err) {
        const error = err as Error;
        res.status(500).json({ message: error.message });
    }
};

// Remove a quiz from organization (back to personal)
export const removeQuizFromOrg = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: { creatorId: true, organizationId: true, title: true }
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        if (quiz.creatorId !== userId) {
            res.status(403).json({ message: 'Chỉ tác giả mới có thể rút quiz khỏi tổ chức.' });
            return;
        }

        const updated = await prisma.quiz.update({
            where: { id: Number(id) },
            data: { organizationId: null },
            include: {
                creator: { select: { id: true, username: true } },
                category: { select: { id: true, name: true } }
            }
        });

        res.status(200).json(updated);
    } catch (err) {
        const error = err as Error;
        res.status(500).json({ message: error.message });
    }
};

const LOCK_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

// Checkout (acquire edit lock) for an org quiz
export const checkoutQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: {
                organizationId: true,
                lockedById: true,
                lockedAt: true,
                lockExpiresAt: true,
                lockedBy: { select: { id: true, username: true } },
            },
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        // Only lock org quizzes
        if (!quiz.organizationId) {
            res.status(200).json({ locked: false, message: 'Personal quizzes do not require checkout' });
            return;
        }

        const now = new Date();
        const isActiveLock =
            quiz.lockedById &&
            quiz.lockedById !== userId &&
            quiz.lockExpiresAt &&
            quiz.lockExpiresAt > now;

        if (isActiveLock) {
            res.status(423).json({
                message: 'Quiz đang bị khóa bởi người khác.',
                lockedBy: quiz.lockedBy?.username ?? 'Unknown',
                lockedById: quiz.lockedById,
                lockedAt: quiz.lockedAt,
                lockExpiresAt: quiz.lockExpiresAt,
            });
            return;
        }

        // Acquire or renew lock
        const lockExpiresAt = new Date(now.getTime() + LOCK_DURATION_MS);
        await prisma.quiz.update({
            where: { id: Number(id) },
            data: {
                lockedById: userId,
                lockedAt: now,
                lockExpiresAt,
            },
        });

        res.status(200).json({ locked: true, lockedById: userId, lockedAt: now, lockExpiresAt });
    } catch (err) {
        const error = err as Error;
        res.status(500).json({ message: error.message });
    }
};

// Checkin (release edit lock)
export const checkinQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: { lockedById: true, organizationId: true },
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        // Allow the lock holder OR org OWNER/ADMIN to release
        if (quiz.lockedById !== userId) {
            const isAdmin =
                req.organizationId &&
                quiz.organizationId === req.organizationId &&
                await prisma.organizationMember.findFirst({
                    where: {
                        organizationId: req.organizationId,
                        userId,
                        role: { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN] },
                    },
                });

            if (!isAdmin) {
                res.status(403).json({ message: 'Bạn không thể giải phóng khóa của người khác.' });
                return;
            }
        }

        await prisma.quiz.update({
            where: { id: Number(id) },
            data: { lockedById: null, lockedAt: null, lockExpiresAt: null },
        });

        res.status(200).json({ message: 'Lock released' });
    } catch (err) {
        const error = err as Error;
        res.status(500).json({ message: error.message });
    }
};

// Force checkin (OWNER/ADMIN only — forcibly remove any lock)
export const forceCheckinQuiz = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const userId = Number(req.userId);

    try {
        const quiz = await prisma.quiz.findUnique({
            where: { id: Number(id) },
            select: { organizationId: true },
        });

        if (!quiz) {
            res.status(404).json({ message: 'Quiz not found' });
            return;
        }

        const isAdmin =
            req.organizationId &&
            quiz.organizationId === req.organizationId &&
            await prisma.organizationMember.findFirst({
                where: {
                    organizationId: req.organizationId,
                    userId,
                    role: { in: [OrganizationRole.OWNER, OrganizationRole.ADMIN] },
                },
            });

        if (!isAdmin) {
            res.status(403).json({ message: 'Chỉ OWNER/ADMIN mới có thể force unlock.' });
            return;
        }

        await prisma.quiz.update({
            where: { id: Number(id) },
            data: { lockedById: null, lockedAt: null, lockExpiresAt: null },
        });

        res.status(200).json({ message: 'Lock force-released' });
    } catch (err) {
        const error = err as Error;
        res.status(500).json({ message: error.message });
    }
};

// Get quizzes from org that can be assigned as homework (for teachers)
export const getAssignableQuizzes = async (req: Request, res: Response): Promise<void> => {
    try {
        const orgId = req.organizationId;
        if (!orgId) {
            res.status(400).json({ message: 'Organization context required' });
            return;
        }

        const data = await prisma.quiz.findMany({
            where: { organizationId: orgId },
            orderBy: { updatedAt: 'desc' },
            include: {
                creator: { select: { id: true, username: true } },
                category: { select: { id: true, name: true } },
                _count: { select: { questions: true } }
            }
        });

        res.status(200).json(data);
    } catch (err) {
        const error = err as Error;
        res.status(400).json({ message: error.message });
    }
};

