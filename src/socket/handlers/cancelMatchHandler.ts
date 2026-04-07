import { Server } from 'socket.io';
import prisma from '../../prismaClient.js';
import { CustomSocket } from '../types.js';
import { getMatch, deleteMatch, removeUserMatch } from '../matchStore.js';

export function handleCancelMatch(io: Server, socket: CustomSocket) {
    return async ({ matchId: rawMatchId }: { matchId: string | number }) => {
        const matchId = String(rawMatchId); // Normalize to string
        const matchState = await getMatch(matchId);
        if (!matchState) {
            return socket.emit('error', 'Match not found');
        }

        // Only the host can cancel the match
        if (Number(socket.userId) !== Number(matchState.hostId)) {
            return socket.emit('error', 'Only the host can cancel the match');
        }

        // Only allow cancellation if match is in waiting state
        if (matchState.state !== 'waiting') {
            return socket.emit('error', 'Cannot cancel a match that has already started');
        }
        
        console.log(`Host ${socket.userId} is cancelling match ${matchId}`);

        // Notify all players in the room
        io.to(String(matchId)).emit('matchCancelled', { message: 'Phòng đã bị hủy bởi chủ phòng.' });

        // Clean up match state for all players
        const players = [...matchState.players];
        await Promise.all(players.map((player) => removeUserMatch(player.userId)));
        await deleteMatch(matchId);

        // Delete from database if it's still in the DB 
        // We can use the deleteMatch from matchController logic but here we do it directly
        try {
            await prisma.match.delete({
                where: { id: Number(matchId) },
            });
        } catch (err) {
            console.error(`Error deleting match ${matchId} from DB:`, err);
        }

        // Force all sockets to leave the room to prevent ghost events
        io.in(String(matchId)).socketsLeave(String(matchId));

        console.log(`Match ${matchId} cancelled and cleaned up by host`);
    };
}
