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

            // Remove player from match only if it's waiting
            if (matchState.state === 'waiting') {
                const playerIndex = matchState.players.findIndex((p) => Number(p.userId) === Number(userId));
                
                // Only act if this is the active socket for the player
                if (playerIndex >= 0 && matchState.players[playerIndex].socketId !== socket.id) {
                    console.log(`Socket ${socket.id} disconnected, but player ${userId} has a newer socket connection. Ignoring.`);
                    return;
                }

                const remainingPlayers = matchState.players.filter((player) => Number(player.userId) !== Number(userId));
                matchState.players = remainingPlayers;

                // Host reassignment check
                if (Number(userId) === Number(matchState.hostId)) {
                    if (remainingPlayers.length > 0) {
                        const newHostId = remainingPlayers[0].userId;
                        matchState.hostId = Number(newHostId);
                        console.log(`Host disconnected, reassigned host for match ${matchId} to user ${newHostId}`);
                        io.to(matchId).emit('hostChanged', { newHostId: Number(newHostId) });
                    }
                }
            } else {
                // If started, keep them but mark as disconnected
                const playerIndex = matchState.players.findIndex((p) => Number(p.userId) === Number(userId));
                // Only act if this is the active socket for the player
                if (playerIndex !== -1) {
                    if (matchState.players[playerIndex].socketId !== socket.id) {
                        console.log(`Socket ${socket.id} disconnected, but player ${userId} has a newer socket connection. Ignoring.`);
                        return;
                    }
                    matchState.players[playerIndex].disconnected = true;
                }
            }

            await saveMatch(matchId, matchState);
            // We should NOT remove user match if the game has started so they can potentially reconnect, 
            // but `getUserMatch` is often used to block joining other games. 
            // We still need to allow them to re-join the SAME game. 
            // Leaving userMatch in Redis actually helps us know they belong to this match.
            if (matchState.state === 'waiting') {
                 await removeUserMatch(userId);
            }

            console.log(`Player/Host ${userId} disconnected from match ${matchId}. Remaining active players: ${matchState.players.filter(p => !p.disconnected).length}`);

            // Notify remaining players
            io.to(matchId).emit('playerLeft', matchState.players);

            // If no players left actively connected, clean up the match gracefully
            const activePlayers = matchState.players.filter(p => !p.disconnected);
            if (activePlayers.length === 0) {
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
