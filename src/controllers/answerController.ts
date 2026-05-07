import { Request, Response } from 'express';
import prisma from '../prismaClient.js';
import { Prisma } from '@prisma/client';
import { checkAnswer, calculatePoints } from '../socket/scoreCalculator.js';
import { AnswerType, Question as SocketQuestion } from '../socket/types.js';

interface CreateAnswerBody {
    questionId: number;
    participantId: number;
    answerData: Prisma.InputJsonValue;
    timeTaken?: number;
}

// Submit answer
export const createAnswer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId } = req.params;
        const userId = req.userId;
        const { questionId, participantId, answerData, timeTaken } = req.body as CreateAnswerBody;

        // Verify participant belongs to this match and to the calling user
        const participant = await prisma.matchParticipant.findFirst({
            where: { id: Number(participantId), matchId: Number(matchId) },
            select: { userId: true },
        });

        if (!participant) {
            res.status(404).json({ message: 'Participant not found in this match' });
            return;
        }

        // Authenticated users may only submit for their own participant slot
        if (participant.userId !== null && participant.userId !== Number(userId)) {
            res.status(403).json({ message: 'Not authorized to submit answer for this participant' });
            return;
        }

        // Fetch question with options for server-side correctness check
        const question = await prisma.question.findUnique({
            where: { id: Number(questionId) },
            include: { options: true },
        });

        if (!question) {
            res.status(404).json({ message: 'Question not found' });
            return;
        }

        // Map Prisma question to the socket Question shape used by checkAnswer
        const questionForCheck: SocketQuestion = {
            id: question.id,
            type: question.type,
            options: question.options.map((o) => ({
                id: o.id,
                text: o.text,
                isCorrect: o.isCorrect ?? undefined,
                order: o.order ?? undefined,
            })),
            data: question.data as SocketQuestion['data'],
        };

        const result = checkAnswer(questionForCheck, answerData as AnswerType);
        const isCorrect = result.isCorrect;

        // Compute score server-side — never trust client-supplied value
        let score = 0;
        if (isCorrect) {
            if (result.score !== undefined) {
                // LOCATION: score comes from distance-band calculation
                score = result.score;
            } else {
                // Fetch match timePerQuestion for time-based scoring
                const match = await prisma.match.findUnique({
                    where: { id: Number(matchId) },
                    select: { timePerQuestion: true },
                });

                if (match?.timePerQuestion && timeTaken != null) {
                    const timeTakenSec = Math.max(0, Number(timeTaken)) / 1000;
                    const submitRemainingTime = Math.max(0, match.timePerQuestion - timeTakenSec);
                    score = calculatePoints(submitRemainingTime, match.timePerQuestion);
                } else {
                    score = 1000;
                }
            }
        }

        const answer = await prisma.matchAnswer.create({
            data: {
                questionId: Number(questionId),
                participantId: Number(participantId),
                answerData,
                isCorrect,
                score,
                timeTaken: timeTaken ? Number(timeTaken) : null,
            },
            include: {
                question: { select: { id: true, text: true, type: true } },
                participant: { select: { id: true, displayName: true } },
            },
        });

        res.status(201).json(answer);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Get all answers for a match (for reports)
export const getMatchAnswers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId } = req.params;
        const userId = req.userId;
        const orgId = req.organizationId ?? null;

        const match = await prisma.match.findUnique({
            where: { id: Number(matchId) },
            include: {
                participants: {
                    include: {
                        answers: {
                            include: {
                                question: { select: { id: true, text: true, type: true } },
                            },
                            orderBy: { answeredAt: 'asc' },
                        },
                        user: { select: { id: true, username: true } },
                    },
                },
                quiz: {
                    include: {
                        questions: { select: { id: true, text: true, type: true } },
                    },
                },
            },
        });

        if (!match) {
            res.status(404).json({ message: 'Match not found' });
            return;
        }

        // Only the host or a member of the match's organisation may read the full report
        const isHost = match.hostId === Number(userId);
        const isSameOrg = orgId !== null && match.organizationId === orgId;
        if (!isHost && !isSameOrg) {
            res.status(403).json({ message: 'Not authorized to view this match report' });
            return;
        }

        // Calculate summary statistics
        const summary = {
            match,
            statistics: {
                totalParticipants: match.participants.length,
                totalQuestions: match.quiz.questions.length,
                participantStats: match.participants.map(p => ({
                    participantId: p.id,
                    displayName: p.displayName,
                    totalScore: p.answers.reduce((sum, a) => sum + a.score, 0),
                    correctAnswers: p.answers.filter(a => a.isCorrect).length,
                    averageTime: p.answers.length > 0
                        ? p.answers.reduce((sum, a) => sum + (a.timeTaken || 0), 0) / p.answers.length
                        : 0,
                })),
            },
        };

        res.status(200).json(summary);
    } catch (err) {
        res.status(500).json(err);
    }
};

// Get participant's answers
export const getParticipantAnswers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { matchId, participantId } = req.params;

        const answers = await prisma.matchAnswer.findMany({
            where: {
                participantId: Number(participantId),
                participant: { matchId: Number(matchId) },
            },
            include: {
                question: {
                    include: {
                        options: true,
                    },
                },
            },
            orderBy: { answeredAt: 'asc' },
        });

        res.status(200).json(answers);
    } catch (err) {
        res.status(500).json(err);
    }
};
