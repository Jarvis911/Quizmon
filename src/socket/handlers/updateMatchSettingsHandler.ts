import { Server } from 'socket.io';
import { CustomSocket, UpdateMatchSettingsPayload } from '../types.js';
import { getMatch, hasMatch, saveMatch } from '../matchStore.js';
import { QUESTION_TIME_LIMIT } from '../constants.js';

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

        // Update Redis match state
        matchState.timePerQuestion = timePerQuestion ?? QUESTION_TIME_LIMIT;
        // Optionally store musicUrl/backgroundUrl if needed in MatchState, 
        // but for now only timePerQuestion is critical for the server logic.
        await saveMatch(matchId, matchState);

        console.log(`Host ${socket.userId} updated settings for match ${matchId}: time=${matchState.timePerQuestion}`);

        // Broadcast settings to all players in the lobby
        io.to(String(matchId)).emit('matchSettingsUpdated', {
            timePerQuestion: matchState.timePerQuestion,
            musicUrl,
            backgroundUrl,
        });
    };
}
