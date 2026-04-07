import { Server } from 'socket.io';
import { CustomSocket, UpdatePlayerInfoPayload } from '../types.js';
import { getMatch, hasMatch, saveMatch } from '../matchStore.js';

export function handleUpdatePlayerInfo(io: Server, socket: CustomSocket) {
    return async ({ matchId: rawMatchId, userId, displayName, avatarUrl }: UpdatePlayerInfoPayload) => {
        const matchId = String(rawMatchId); // Normalize to string
        if (!(await hasMatch(matchId))) {
            return socket.emit('error', 'Match not found');
        }

        const matchState = await getMatch(matchId);
        if (!matchState) return;

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
        io.to(String(matchId)).emit('playerJoined', matchState.players);
    };
}
