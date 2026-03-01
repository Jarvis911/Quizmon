import { getMatch, hasMatch, removeUserMatch, saveMatch } from '../matchStore.js';
import { endMatch } from './endMatchHandler.js';
export function handleSurrender(io, socket) {
    return async ({ matchId }) => {
        if (!(await hasMatch(matchId))) {
            return socket.emit('error', 'Match not found');
        }
        const matchState = await getMatch(matchId);
        if (!matchState)
            return;
        const userId = socket.userId;
        if (!userId)
            return;
        // Cannot surrender if match hasn't started
        if (matchState.state !== 'started') {
            return socket.emit('error', 'Match has not started yet');
        }
        // Remove player from match
        matchState.players = matchState.players.filter((p) => p.userId !== userId);
        await saveMatch(matchId, matchState);
        await removeUserMatch(userId);
        // Leave the socket room
        socket.leave(matchId);
        socket.matchId = undefined;
        socket.userId = undefined;
        console.log(`Player ${userId} surrendered from match ${matchId}`);
        // Notify the surrendering player
        socket.emit('surrendered');
        // Notify remaining players
        io.to(matchId).emit('playerSurrendered', {
            userId,
            remainingPlayers: matchState.players,
        });
        // Update scores for remaining players
        io.to(matchId).emit('updatedScores', matchState.players);
        // End match if no players left
        if (matchState.players.length === 0) {
            await endMatch(io, matchId);
        }
    };
}
