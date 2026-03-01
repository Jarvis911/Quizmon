import { getMatch, hasMatch, removeUserMatch, saveMatch } from '../matchStore.js';
import { endMatch } from './endMatchHandler.js';
export function handleDisconnect(io, socket) {
    return async () => {
        console.log('Socket disconnected:', socket.id);
        const { matchId, userId } = socket;
        if (matchId && (await hasMatch(matchId)) && userId) {
            const matchState = await getMatch(matchId);
            if (!matchState)
                return;
            // Remove player from match
            matchState.players = matchState.players.filter((player) => player.userId !== userId);
            await saveMatch(matchId, matchState);
            await removeUserMatch(userId);
            console.log(`Player ${userId} left match ${matchId}. Remaining players: ${matchState.players.length}`);
            // Notify remaining players
            io.to(matchId).emit('playerLeft', matchState.players);
            // End match if no players left
            if (matchState.players.length === 0) {
                await endMatch(io, matchId);
            }
        }
    };
}
