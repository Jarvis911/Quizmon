import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
import { getMatch, updateMatchState } from '../matchStore.js';
import { MatchState } from '../types.js';

export function handleTogglePause(io: Server, socket: CustomSocket) {
    return async ({ matchId: rawMatchId }: { matchId: string | number }) => {
        const matchId = String(rawMatchId); // Normalize to string
        const matchState = await getMatch(matchId);

        if (!matchState) {
            return socket.emit('error', 'Match not found');
        }

        if (!socket.userId || Number(socket.userId) !== Number(matchState.hostId)) {
            return socket.emit('error', 'Only host can toggle pause');
        }

        if (matchState.state !== 'started') {
            return socket.emit('error', 'Can only pause a started match');
        }

        const updatedState = await updateMatchState(matchId, (state: MatchState) => {
            state.isPaused = !state.isPaused;
            return state;
        });

        if (!updatedState) return;

        console.log(`Match ${matchId} pause status: ${updatedState.isPaused}`);

        // Notify all players in the match
        io.to(String(matchId)).emit('pauseStatusUpdated', { isPaused: updatedState.isPaused });
    };
}
