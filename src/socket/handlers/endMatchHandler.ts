import { Server } from 'socket.io';
import prisma from '../../prismaClient.js';
import { Prisma } from '@prisma/client';
import { CustomSocket } from '../types.js';
import { getMatch, deleteMatch, removeUserMatch, matchIntervals } from '../matchStore.js';

export async function endMatch(io: Server, matchId: string): Promise<void> {
    const matchState = await getMatch(matchId);

    if (!matchState) return;

    // Clear timer
    const interval = matchIntervals.get(matchId);
    if (interval) {
        clearInterval(interval);
        matchIntervals.delete(matchId);
    }

    matchState.state = 'ended';
    matchState.endTime = new Date();

    // Update match end time in database
    await prisma.match.update({
        where: { id: Number(matchId) },
        data: { endTime: matchState.endTime },
    });

    // Create result for each player
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const p of matchState.players) {
            await tx.matchResult.create({
                data: {
                    matchId: Number(matchId),
                    userId: p.userId,
                    score: p.score,
                },
            });
        }
    });

    // Generate leaderboard (sorted by score, then alphabetically)
    const leaderboard = [...matchState.players]
        .sort((a, b) => b.score - a.score || a.username.localeCompare(b.username))
        .map((player) => ({
            userId: player.userId,
            username: player.username,
            displayName: player.displayName,
            avatarUrl: player.avatarUrl,
            score: player.score,
        }));

    // Notify all players
    io.to(matchId).emit('gameOver', { leaderboard });

    // Clean up match state (no await needed for Promise.all map since order doesn't matter, but good practice)
    await Promise.all(matchState.players.map((player) => removeUserMatch(player.userId)));
    await deleteMatch(matchId);

    console.log(`Match ${matchId} ended and cleaned up`);
}

export function handleEndMatch(io: Server, socket: CustomSocket) {
    return async ({ matchId }: { matchId: string }) => {
        const matchState = await getMatch(matchId);
        if (!matchState) return;

        // Only the host can end the match early
        if (socket.userId !== matchState.hostId) {
            return socket.emit('error', 'Only the host can end the match');
        }

        console.log(`Host ${socket.userId} ended match ${matchId} early`);
        await endMatch(io, matchId);
    };
}

