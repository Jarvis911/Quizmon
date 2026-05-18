import { CustomSocket, RequestCurrentQuestionPayload } from '../types.js';
import { getMatch, matchRemainingTimes } from '../matchStore.js';

export function handleRequestCurrentQuestion(socket: CustomSocket) {
    return async ({ matchId: rawMatchId }: RequestCurrentQuestionPayload) => {
        const matchId = String(rawMatchId); // Normalize to string
        const matchState = await getMatch(matchId);
        if (!matchState) return;

        const rawQuestion = matchState.questions[matchState.currentQuestionIndex];
        if (!rawQuestion) return;

        // Strip isCorrect from options before sending to the client, otherwise a
        // player inspecting the socket payload would see which option is correct.
        const question = {
            ...rawQuestion,
            options: rawQuestion.options.map(opt => {
                const { isCorrect, ...rest } = opt as any;
                return rest;
            }),
        };

        // Prefer the fresh in-memory remaining time (the server tick interval
        // only syncs Redis every 1s, so Redis can be ~1s stale).
        const freshRemaining = matchRemainingTimes.get(matchId) ?? matchState.remainingTime;

        socket.emit('nextQuestion', {
            question,
            timer: freshRemaining,
            isPaused: matchState.isPaused,
        });
    };
}
