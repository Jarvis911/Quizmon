import { getMatch, updateMatchState } from '../matchStore.js';
export function handleTogglePause(io, socket) {
    return async ({ matchId: rawMatchId }) => {
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
        const updatedState = await updateMatchState(matchId, (state) => {
            state.isPaused = !state.isPaused;
            return state;
        });
        if (!updatedState)
            return;
        console.log(`Match ${matchId} pause status: ${updatedState.isPaused}`);
        // Notify all players in the match
        io.to(String(matchId)).emit('pauseStatusUpdated', { isPaused: updatedState.isPaused });
    };
}
