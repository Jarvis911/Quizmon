import { Server } from 'socket.io';
import { CustomSocket, UpdateMatchSettingsPayload } from '../types.js';
import { getMatch, hasMatch } from '../matchStore.js';

export function handleUpdateMatchSettings(io: Server, socket: CustomSocket) {
    return async ({ matchId: rawMatchId, timePerQuestion, musicUrl, backgroundUrl }: UpdateMatchSettingsPayload) => {
        const matchId = String(rawMatchId); // Normalize to string
        if (!(await hasMatch(matchId))) {
            return socket.emit('error', 'Match not found');
        }

        const matchState = await getMatch(matchId);
        if (!matchState) return;

        // Only the host can update match settings
        if (socket.userId !== matchState.hostId) {
            return socket.emit('error', 'Only the host can update match settings');
        }

        if (matchState.state !== 'waiting') {
            return socket.emit('error', 'Cannot update settings after match has started');
        }

        console.log(`Host ${socket.userId} updated settings for match ${matchId}`);

        // Broadcast settings to all players in the lobby
        io.to(String(matchId)).emit('matchSettingsUpdated', {
            timePerQuestion,
            musicUrl,
            backgroundUrl,
        });
    };
}
