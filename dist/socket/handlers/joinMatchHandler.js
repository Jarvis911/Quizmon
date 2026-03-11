import prisma from '../../prismaClient.js';
import { MAX_PLAYER_PER_MATCH, MAX_ACTIVE_MATCHES } from '../constants.js';
import { getMatch, hasMatch, saveMatch, getUserMatch, setUserMatch, getActiveMatchCount, } from '../matchStore.js';
export function handleJoinMatch(io, socket) {
    return async ({ matchId, userId, username, displayName, avatarUrl }) => {
        try {
            console.log(`[joinMatch] Incoming request from ${userId} for match ${matchId}`);
            // Check if user is already in a match
            const currentUserMatchId = await getUserMatch(userId);
            if (currentUserMatchId) {
                if (currentUserMatchId !== matchId) {
                    console.log(`[joinMatch] User ${userId} already in match ${currentUserMatchId}`);
                    // User is in a different match
                    return socket.emit('alreadyInMatch', { currentMatchId: currentUserMatchId });
                }
                // If they are in the same match, we allow them to continue to join and resubscribe to the socket room.
                // And potentially update their socket properties.
            }
            if (!(await hasMatch(matchId))) {
                console.log(`[joinMatch] Match ${matchId} not in redis, fetching from DB...`);
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
                                    include: { options: true, media: true },
                                },
                            },
                        },
                    },
                });
                if (!match) {
                    console.log(`[joinMatch] Match ${matchId} not found in DB`);
                    return socket.emit('error', 'Match not found');
                }
                console.log(`[joinMatch] Match ${matchId} found in DB, host: ${match.hostId}`);
                // Initialize match state
                await saveMatch(matchId, {
                    state: 'waiting',
                    hostId: match.hostId,
                    players: [],
                    currentQuestionIndex: 0,
                    questions: match.quiz.questions,
                    remainingTime: 0,
                    startTime: null,
                    endTime: null,
                    answers: new Map(),
                });
                console.log(`[joinMatch] Match ${matchId} initialized in Redis`);
            }
            const matchState = await getMatch(matchId);
            if (!matchState) {
                console.log(`[joinMatch] getMatch returned undefined for ${matchId} after initialization!`);
                return;
            }
            if (matchState.state !== 'waiting') {
                return socket.emit('error', 'Match has already started or ended');
            }
            if (matchState.players.length >= MAX_PLAYER_PER_MATCH) {
                return socket.emit('error', 'Match is full');
            }
            const playerIndex = matchState.players.findIndex(p => Number(p.userId) === Number(userId));
            if (playerIndex >= 0) {
                // Update existing player info
                matchState.players[playerIndex] = {
                    ...matchState.players[playerIndex],
                    username,
                    displayName: displayName || username,
                    avatarUrl: avatarUrl || null,
                };
            }
            else {
                // Add player to match with display customization
                matchState.players.push({
                    userId: Number(userId),
                    username,
                    displayName: displayName || username,
                    avatarUrl: avatarUrl || null,
                    score: 0,
                    submitted: new Set(),
                });
            }
            await saveMatch(matchId, matchState);
            await setUserMatch(Number(userId), matchId);
            // Join socket room
            socket.join(matchId);
            socket.matchId = matchId;
            socket.userId = Number(userId);
            console.log(`Player ${userId} join match ${matchId}! Players count: ${matchState.players.length}`);
            // Notify all players in the match
            io.to(matchId).emit('playerJoined', matchState.players);
        }
        catch (error) {
            console.error(`[joinMatch] Error joining match ${matchId}:`, error);
            socket.emit('error', 'An internal error occurred while joining the match');
        }
    };
}
