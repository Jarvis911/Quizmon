import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
import { getMatch, hasMatch, removeUserMatch, saveMatch } from '../matchStore.js';
import { endMatch } from './endMatchHandler.js';

export function handleLeaveMatch(io: Server, socket: CustomSocket) {
    return async ({ matchId }: { matchId: string }) => {
        if (!(await hasMatch(matchId))) {
            return socket.emit('error', 'Match not found');
        }

        const matchState = await getMatch(matchId);
        if (!matchState) return;
        const userId = socket.userId;

        if (!userId) return;

        // Remove player from match
        matchState.players = matchState.players.filter((p) => p.userId !== userId);

        await saveMatch(matchId, matchState);
        await removeUserMatch(userId);

        // Leave the socket room
        socket.leave(matchId);
        if (socket.matchId === matchId) {
            socket.matchId = undefined;
        }

        console.log(`Player ${userId} explicitly left match ${matchId}`);

        // Notify the leaving player so frontend can proceed
        socket.emit('leftMatch');

        // Notify remaining players
        io.to(matchId).emit('playerLeft', matchState.players);

        // End match if no players left and the match hasn't started natively (e.g. host leaves)
        if (matchState.players.length === 0) {
            await endMatch(io, matchId);
        }
    };
}
