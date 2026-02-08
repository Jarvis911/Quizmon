import express, { Express } from 'express';
import cors from 'cors';
import http from 'http';
import path, { dirname } from 'path';
import { fileURLToPath } from 'url';
import passport from './config/passport.ts';
import authRoutes from './routes/authRoutes.js';
import corsMiddleware from './middleware/corsMiddleware.js';
import quizRoutes from './routes/quizRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.ts';
import { Server, Socket } from 'socket.io';
import haversine from 'haversine-distance';
import prisma from './prismaClient.js';
import { Prisma } from '@prisma/client';

// Types
interface Player {
    userId: number;
    username: string;
    score: number;
    submitted: Set<number>;
}

interface MatchState {
    state: 'waiting' | 'started' | 'ended';
    hostId: number;
    players: Player[];
    currentQuestionIndex: number;
    questions: Question[];
    remainingTime: number;
    timeInterval: ReturnType<typeof setInterval> | null;
    startTime: Date | null;
    endTime: Date | null;
    answers: Map<number, Map<number, { answer: AnswerType; submitRemainingTime: number }>>;
}

interface Question {
    id: number;
    type: string;
    options: { isCorrect?: boolean; order?: number; text: string }[];
    range?: { minValue: number; maxValue: number; correctValue: number };
    typeAnswer?: { correctAnswer: string };
    location?: { correctLatitude: number; correctLongitude: number };
}

type AnswerType = number | boolean[] | string | { lat: number; lon: number };

interface CustomSocket extends Socket {
    matchId?: string;
    userId?: number;
}

// docker compose run app npx prisma migrate dev --name init
// node swagger.js

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Go to src
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Passport
app.use(passport.initialize());

// Middleware
app.use(express.json());
app.use(corsMiddleware);
app.use(express.static(path.join(__dirname, '../public')));
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/auth', authRoutes);
app.use('/quiz', quizRoutes);
app.use('/category', categoryRoutes);
app.use('/question', questionRoutes);
app.use('/match', matchRoutes);
app.use('/rating', ratingRoutes);
app.use('/user', userRoutes);

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT'],
    },
});

server.listen(PORT, () => {
    console.log(`Socket + server has running on ${PORT}`);
});

// Constants
const MAX_PLAYER_PER_MATCH = 2;
const QUESTION_TIME_LIMIT = 30;
const MAX_ACTIVE_MATCHES = 1;

// Temp
const matches = new Map<string, MatchState>();
const userToMatch = new Map<number, string>();

io.on('connection', (socket: CustomSocket) => {
    console.log('Socket connected:', socket.id);

    socket.on('joinMatch', async ({ matchId, userId, username }: { matchId: string; userId: number; username: string }) => {
        // Check if user is already in a match!
        if (userToMatch.has(userId)) {
            return socket.emit('error', 'You are already in another match');
        }

        if (!matches.has(matchId)) {
            if (matches.size >= MAX_ACTIVE_MATCHES) {
                return socket.emit('error', 'Server at maximum active matches!');
            }

            // Return the quiz and all the questions in quiz data
            const match = await prisma.match.findUnique({
                where: { id: Number(matchId) },
                include: {
                    quiz: {
                        include: {
                            questions: {
                                include: { options: true, range: true, typeAnswer: true, location: true, media: true },
                            },
                        },
                    },
                },
            });

            if (!match) return socket.emit('error', 'Match not found');

            // Initialize matches
            matches.set(matchId, {
                state: 'waiting',
                hostId: match.hostId,
                players: [],
                currentQuestionIndex: 0,
                questions: match.quiz.questions as Question[],
                remainingTime: 0,
                timeInterval: null,
                startTime: null,
                endTime: null,
                answers: new Map(),
            });
        }

        const matchState = matches.get(matchId)!;

        if (matchState.state !== 'waiting') {
            return socket.emit('error', 'Match has already started or ended');
        }

        if (matchState.players.length >= MAX_PLAYER_PER_MATCH) {
            return socket.emit('error', 'Match is full');
        }

        matchState.players.push({ userId, username, score: 0, submitted: new Set() });
        userToMatch.set(userId, matchId);
        io.to(matchId).emit('playerJoined', matchState.players);

        socket.join(matchId); // Join this socket in matchId room
        socket.matchId = matchId;
        socket.userId = userId;
        console.log(`Player ${userId} join match ${matchId}!`);
        io.to(matchId).emit('playerJoined', matchState.players);
    });

    socket.on('startMatch', async ({ matchId }: { matchId: string }) => {
        const matchState = matches.get(matchId);
        if (!matchState) return socket.emit('error', 'Match not found');

        if (socket.userId !== matchState.hostId) {
            return socket.emit('error', 'Only host can start the match');
        }

        if (matchState.state !== 'waiting') {
            return socket.emit('error', 'Match already started');
        }

        matchState.state = 'started';
        matchState.startTime = new Date();

        await prisma.match.update({
            where: {
                id: Number(matchId),
            },
            data: {
                startTime: new Date(),
            },
        });

        console.log(`Match ${matchId} started by host ${socket.userId}`);

        io.to(matchId).emit('gameStarted');

        sendNextQuestion(matchId);
    });

    socket.on('submitAnswer', ({ matchId, userId, questionId, answer }: { matchId: string; userId: number; questionId: number; answer: AnswerType }) => {
        const matchState = matches.get(matchId);
        if (!matchState || matchState.state !== 'started') {
            return socket.emit('error', 'Invalid match state');
        }

        // Validate user is in match
        const player = matchState.players.find((p) => p.userId === userId);
        if (!player) {
            return socket.emit('error', 'Not in match');
        }

        const currentQuestion = matchState.questions[matchState.currentQuestionIndex];
        if (!currentQuestion || currentQuestion.id !== questionId) {
            return socket.emit('error', 'Invalid question');
        }

        // Check if already submitted
        if (player.submitted.has(questionId)) {
            return socket.emit('error', 'Already submitted for this question');
        }

        // Check if time remaining > 0
        if (matchState.remainingTime <= 0) {
            return socket.emit('error', 'Time up for this question');
        }

        // Validate answer payload based on type (anti-cheat)
        let isValidAnswer = false;
        switch (currentQuestion.type) {
            case 'BUTTONS':
                isValidAnswer = Number.isInteger(answer) && (answer as number) >= 0 && (answer as number) < currentQuestion.options.length;
                break;
            case 'CHECKBOXES':
                isValidAnswer = Array.isArray(answer) && answer.length === currentQuestion.options.length && answer.every((a) => typeof a === 'boolean');
                break;
            case 'RANGE':
                isValidAnswer =
                    typeof answer === 'number' && !!currentQuestion.range && answer >= currentQuestion.range.minValue && answer <= currentQuestion.range.maxValue;
                break;
            case 'REORDER':
                isValidAnswer = Array.isArray(answer) && answer.length === currentQuestion.options.length && new Set(answer).size === answer.length;
                break;
            case 'TYPEANSWER':
                isValidAnswer = typeof answer === 'string' && answer.trim().length > 0;
                break;
            case 'LOCATION':
                isValidAnswer =
                    typeof answer === 'object' &&
                    answer !== null &&
                    'lat' in answer &&
                    'lon' in answer &&
                    typeof (answer as { lat: number; lon: number }).lat === 'number' &&
                    typeof (answer as { lat: number; lon: number }).lon === 'number';
                break;
            default:
                return socket.emit('error', 'Unsupported question type');
        }

        if (!isValidAnswer) {
            return socket.emit('error', 'Invalid answer format');
        }

        if (!matchState.answers.has(questionId)) {
            matchState.answers.set(questionId, new Map());
        }

        const remainingTime = matchState.remainingTime;
        matchState.answers.get(questionId)!.set(userId, {
            answer: answer,
            submitRemainingTime: typeof remainingTime === 'number' ? remainingTime : 0,
        });

        player.submitted.add(questionId);

        // Emit confirmation to user
        socket.emit('answerSubmitted', { questionId });

        // Check if all players submitted, if yes, early timeUp
        if (matchState.players.every((p) => p.submitted.has(questionId))) {
            processTimeUp(matchId);
        }
    });

    socket.on('requestCurrentQuestion', ({ matchId }: { matchId: string }) => {
        const matchState = matches.get(matchId);
        if (!matchState) return;
        const question = matchState.questions[matchState.currentQuestionIndex];
        if (!question) return;
        socket.emit('nextQuestion', { question, timer: matchState.remainingTime });
    });

    socket.on('endMatch', ({ matchId }: { matchId: string }) => endMatch(matchId));

    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);

        const { matchId, userId } = socket;

        if (matchId && matches.has(matchId) && userId) {
            const matchState = matches.get(matchId)!;
            matchState.players = matchState.players.filter((player) => player.userId != userId);
            userToMatch.delete(userId);

            console.log(`Player ${userId} left match ${matchId}. Remaining players: ${matchState.players.length}`);
            io.to(matchId).emit('playerLeft', matchState.players);

            if (matchState.players.length === 0) {
                endMatch(matchId);
            }
        }
    });

    const startQuestionTimer = (matchId: string): void => {
        const matchState = matches.get(matchId);
        if (!matchState) return;

        matchState.remainingTime = QUESTION_TIME_LIMIT;

        io.to(matchId).emit('timeUpdate', matchState.remainingTime);

        matchState.timeInterval = setInterval(() => {
            matchState.remainingTime = Math.max(0, matchState.remainingTime - 0.1);
            io.to(matchId).emit('timeUpdate', Number(matchState.remainingTime.toFixed(1)));

            if (matchState.remainingTime <= 0) {
                clearInterval(matchState.timeInterval!);
                matchState.timeInterval = null;
                processTimeUp(matchId);
            }
        }, 100);
    };

    const processTimeUp = (matchId: string): void => {
        const matchState = matches.get(matchId);
        if (!matchState) return;

        if (matchState.timeInterval) {
            clearInterval(matchState.timeInterval);
            matchState.timeInterval = null;
        }

        const q = matchState.questions[matchState.currentQuestionIndex];
        if (!q) return;
        const questionId = q.id;
        const answersMap = matchState.answers.get(questionId) || new Map();

        for (const player of matchState.players) {
            const entry = answersMap.get(player.userId);
            const ans = entry?.answer;
            let submitRemainingTime = entry ? entry.submitRemainingTime : 0;
            let correctLatLon: { latitude?: number; longitude?: number } = {};
            let isCorrect = false;

            if (entry) {
                switch (q.type) {
                    case 'BUTTONS':
                        isCorrect = !!q.options[ans as number]?.isCorrect;
                        break;
                    case 'CHECKBOXES':
                        isCorrect = (ans as boolean[]).every((a, i) => (q.options[i].isCorrect ?? false) === a);
                        break;
                    case 'RANGE':
                        isCorrect = q.range ? Math.abs(q.range.correctValue - (ans as number)) <= 5 : false;
                        break;
                    case 'REORDER':
                        isCorrect = (ans as number[]).every((a, i) => a === q.options[i]?.order);
                        break;
                    case 'TYPEANSWER':
                        isCorrect = q.typeAnswer ? q.typeAnswer.correctAnswer.toLowerCase() === (ans as string).toLowerCase() : false;
                        break;
                    case 'LOCATION': {
                        if (q.location) {
                            correctLatLon = { latitude: +q.location.correctLatitude, longitude: +q.location.correctLongitude };
                            const userAns = { latitude: +(ans as { lat: number; lon: number }).lat, longitude: +(ans as { lat: number; lon: number }).lon };
                            const distance = haversine(correctLatLon as { latitude: number; longitude: number }, userAns);
                            isCorrect = distance <= 30000;
                        }
                        break;
                    }
                }
            }

            if (isCorrect) {
                let points = +(1000 * (submitRemainingTime / QUESTION_TIME_LIMIT)).toFixed(1);
                player.score += points;
            }

            if (q.type === 'LOCATION') {
                io.to(matchId).emit('answerResult', { userId: player.userId, isCorrect, questionId, correctLatLon });
            } else {
                io.to(matchId).emit('answerResult', { userId: player.userId, isCorrect, questionId });
            }
        }

        matchState.players.forEach((p) => (p.submitted = new Set()));

        io.to(matchId).emit(
            'updatedScores',
            matchState.players.map((p) => ({
                userId: p.userId,
                username: p.username,
                score: p.score,
            }))
        );

        setTimeout(() => {
            matchState.currentQuestionIndex++;
            sendNextQuestion(matchId);
        }, 5000);
    };

    const sendNextQuestion = (matchId: string): void => {
        const matchState = matches.get(matchId);
        if (!matchState) return;

        if (matchState.currentQuestionIndex >= matchState.questions.length) return endMatch(matchId);

        const question = matchState.questions[matchState.currentQuestionIndex];
        io.to(matchId).emit('nextQuestion', { question, timer: QUESTION_TIME_LIMIT });

        startQuestionTimer(matchId);
    };

    const endMatch = (matchId: string): void => {
        const matchState = matches.get(matchId);

        if (!matchState) return;

        if (matchState.timeInterval) {
            clearInterval(matchState.timeInterval);
            matchState.timeInterval = null;
        }

        matchState.state = 'ended';
        matchState.endTime = new Date();

        // Update time end of the match
        prisma.match.update({
            where: {
                id: Number(matchId),
            },
            data: {
                endTime: matchState.endTime,
            },
        });

        // Create result of each players to save!
        prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            for (const p of matchState.players) {
                await tx.matchResult.create({
                    data: {
                        matchId: Number(matchId),
                        userId: p.userId,
                        score: p.score,
                    },
                });
            }
        });

        // Should I put a method for tiebreak when 2 players have the same points?
        const leaderboard = [...matchState.players]
            .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
            .map((player) => ({ userId: player.userId, username: player.username, score: player.score }));

        io.to(matchId).emit('gameOver', { leaderboard }); // Destructure this to get point

        // Update match state and clean up
        matchState.players.forEach((player) => userToMatch.delete(player.userId));
        matches.delete(matchId);

        console.log(`Match ${matchId} ended and cleaned up`);
    };
});
