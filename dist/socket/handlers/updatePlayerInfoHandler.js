import { getMatch, hasMatch, saveMatch } from '../matchStore.js';
export function handleUpdatePlayerInfo(io, socket) {
    return async ({ matchId, userId, displayName, avatarUrl }) => {
        if (!(await hasMatch(matchId))) {
            return socket.emit('error', 'Match not found');
        }
        const matchState = await getMatch(matchId);
        if (!matchState)
            return;
        if (matchState.state !== 'waiting') {
            return socket.emit('error', 'Cannot update player info after match has started');
        }
        const player = matchState.players.find(p => p.userId === userId);
        if (!player) {
            return socket.emit('error', 'Player not found in this match');
        }
        // Update player info
        player.displayName = displayName || player.username;
        player.avatarUrl = avatarUrl || null;
        await saveMatch(matchId, matchState);
        console.log(`Player ${userId} updated info in match ${matchId}: ${displayName}`);
        // Broadcast updated player list to all players in the match
        io.to(matchId).emit('playerJoined', matchState.players);
    };
}
