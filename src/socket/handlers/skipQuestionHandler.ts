import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
import { getMatch } from '../matchStore.js';
import { skipToNextQuestion } from '../gameTimer.js';

export function handleSkipQuestion(io: Server, socket: CustomSocket) {
    return async ({ matchId }: { matchId: string | number }) => {
        const matchState = await getMatch(matchId);

        if (!matchState) {
            return socket.emit('error', 'Match not found');
        }

        if (!socket.userId || Number(socket.userId) !== Number(matchState.hostId)) {
            return socket.emit('error', 'Only host can skip questions');
        }

        if (matchState.state !== 'started') {
            return socket.emit('error', 'Match not started yet');
        }

        console.log(`Match ${matchId} skipped to next question by host ${socket.userId}`);

        // Call the utility to skip the question
        await skipToNextQuestion(io, matchId);
    };
}
