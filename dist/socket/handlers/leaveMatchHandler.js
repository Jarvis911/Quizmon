import { getMatch, hasMatch, removeUserMatch, saveMatch, deleteMatch } from '../matchStore.js';
import { endMatch } from './endMatchHandler.js';
export function handleLeaveMatch(io, socket) {
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
        if (Number(userId) === Number(matchState.hostId) && matchState.state === 'waiting') {
            console.log(`Host ${userId} left match ${matchId}`);
            // Reassign host if there are other players
            const remainingPlayers = matchState.players.filter((p) => Number(p.userId) !== Number(userId));
            if (remainingPlayers.length > 0) {
                const newHostId = remainingPlayers[0].userId;
                matchState.hostId = Number(newHostId);
                matchState.players = remainingPlayers;
                console.log(`Reassigned host for match ${matchId} to user ${newHostId}`);
                await saveMatch(matchId, matchState);
                await removeUserMatch(userId);
                socket.emit('leftMatch');
                socket.leave(matchId);
                if (socket.matchId === matchId) {
                    socket.matchId = undefined;
                }
                io.to(matchId).emit('playerLeft', remainingPlayers);
                io.to(matchId).emit('hostChanged', { newHostId: Number(newHostId) });
                return;
            }
            else {
                console.log(`Host ${userId} left match ${matchId}, cleaning up Redis state as no players left`);
                // Tell the host they left successfully FIRST before broadcasting destruction
                socket.emit('leftMatch');
                socket.leave(matchId);
                if (socket.matchId === matchId) {
                    socket.matchId = undefined;
                }
                await removeUserMatch(userId);
                await deleteMatch(matchId);
                return;
            }
        }
        // Remove player from match
        matchState.players = matchState.players.filter((p) => Number(p.userId) !== Number(userId));
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
            if (matchState.state === 'waiting') {
                await deleteMatch(matchId);
            }
            else {
                await endMatch(io, matchId);
            }
        }
    };
}
