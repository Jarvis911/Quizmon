import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
import { getMatch, hasMatch, removeUserMatch, saveMatch, deleteMatch } from '../matchStore.js';
import { endMatch } from './endMatchHandler.js';
import { handleCancelMatch } from './cancelMatchHandler.js';

export function handleDisconnect(io: Server, socket: CustomSocket) {
    return async () => {
        console.log('Socket disconnected:', socket.id);

        const { matchId, userId } = socket;

        if (matchId && (await hasMatch(matchId)) && userId) {
            const matchState = await getMatch(matchId);
            if (!matchState) return;

            // Remove player from match
            matchState.players = matchState.players.filter((player) => Number(player.userId) !== Number(userId));

            await saveMatch(matchId, matchState);
            await removeUserMatch(userId);

            console.log(`Player/Host ${userId} disconnected from match ${matchId}. Remaining players: ${matchState.players.length}`);

            // Notify remaining players
            io.to(matchId).emit('playerLeft', matchState.players);

            // If no players left, clean up the match gracefully
            if (matchState.players.length === 0) {
                if (matchState.state === 'waiting') {
                    // Just clean up from Redis, don't delete from Prisma DB
                    // This allows the host to reconnect and recreate the lobby state
                    console.log(`Match ${matchId} is empty and waiting, cleaning up Redis state.`);
                    await deleteMatch(matchId);
                } else if (matchState.state === 'started') {
                    // Everyone left an active match, gracefully end it so results map correctly
                    console.log(`Match ${matchId} is empty and started, ending match gracefully.`);
                    await endMatch(io, matchId);
                }
            }
        }
    };
}
