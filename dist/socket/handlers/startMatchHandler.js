import prisma from '../../prismaClient.js';
import { getMatch, saveMatch } from '../matchStore.js';
import { startQuestionTimer } from '../gameTimer.js';
export function handleStartMatch(io, socket) {
    return async ({ matchId }) => {
        const matchState = await getMatch(matchId);
        if (!matchState) {
            return socket.emit('error', 'Match not found');
        }
        if (socket.userId !== matchState.hostId) {
            return socket.emit('error', 'Only host can start the match');
        }
        if (matchState.state !== 'waiting') {
            return socket.emit('error', 'Match already started');
        }
        // Update match state
        matchState.state = 'started';
        matchState.startTime = new Date();
        await saveMatch(matchId, matchState);
        // Persist start time to database
        await prisma.match.update({
            where: { id: Number(matchId) },
            data: { startTime: new Date() },
        });
        console.log(`Match ${matchId} started by host ${socket.userId}`);
        // Notify all players
        io.to(matchId).emit('gameStarted');
        // Send first question
        await sendNextQuestion(io, matchId);
    };
}
export async function sendNextQuestion(io, matchId) {
    const matchState = await getMatch(matchId);
    if (!matchState)
        return;
    // Check if match is over
    if (matchState.currentQuestionIndex >= matchState.questions.length) {
        // Import dynamically to avoid circular dependency
        const { endMatch } = await import('./endMatchHandler.js');
        await endMatch(io, matchId);
        return;
    }
    const question = matchState.questions[matchState.currentQuestionIndex];
    io.to(matchId).emit('nextQuestion', { question, timer: matchState.remainingTime });
    await startQuestionTimer(io, matchId);
}
