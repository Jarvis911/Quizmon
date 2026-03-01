import { Server } from 'socket.io';
import prisma from '../../prismaClient.js';
import { CustomSocket, JoinMatchPayload, Question } from '../types.js';
import { MAX_PLAYER_PER_MATCH, MAX_ACTIVE_MATCHES } from '../constants.js';
import {
    getMatch,
    hasMatch,
    saveMatch,
    isUserInMatch,
    setUserMatch,
    getActiveMatchCount,
} from '../matchStore.js';

export function handleJoinMatch(io: Server, socket: CustomSocket) {
    return async ({ matchId, userId, username, displayName, avatarUrl }: JoinMatchPayload) => {
        // Check if user is already in a match
        if (await isUserInMatch(userId)) {
            return socket.emit('error', 'You are already in another match');
        }

        if (!(await hasMatch(matchId))) {
            const matchCount = await getActiveMatchCount();
            if (matchCount >= MAX_ACTIVE_MATCHES) {
                return socket.emit('error', 'Server at maximum active matches!');
            }

            // Fetch match with quiz data from database
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

            if (!match) {
                return socket.emit('error', 'Match not found');
            }

            // Initialize match state
            await saveMatch(matchId, {
                state: 'waiting',
                hostId: match.hostId,
                players: [],
                currentQuestionIndex: 0,
                questions: match.quiz.questions as Question[],
                remainingTime: 0,
                startTime: null,
                endTime: null,
                answers: new Map(),
            });
        }

        const matchState = await getMatch(matchId);
        if (!matchState) return;

        if (matchState.state !== 'waiting') {
            return socket.emit('error', 'Match has already started or ended');
        }

        if (matchState.players.length >= MAX_PLAYER_PER_MATCH) {
            return socket.emit('error', 'Match is full');
        }

        // Add player to match with display customization
        matchState.players.push({
            userId,
            username,
            displayName: displayName || username,
            avatarUrl: avatarUrl || null,
            score: 0,
            submitted: new Set(),
        });

        await saveMatch(matchId, matchState);
        await setUserMatch(userId, matchId);

        // Join socket room
        socket.join(matchId);
        socket.matchId = matchId;
        socket.userId = userId;

        console.log(`Player ${userId} join match ${matchId}!`);

        // Notify all players in the match
        io.to(matchId).emit('playerJoined', matchState.players);
    };
}
