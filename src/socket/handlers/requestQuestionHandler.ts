import { CustomSocket, RequestCurrentQuestionPayload } from '../types.js';
import { getMatch } from '../matchStore.js';

export function handleRequestCurrentQuestion(socket: CustomSocket) {
    return async ({ matchId }: RequestCurrentQuestionPayload) => {
        const matchState = await getMatch(matchId);
        if (!matchState) return;

        const question = matchState.questions[matchState.currentQuestionIndex];
        if (!question) return;

        socket.emit('nextQuestion', { question, timer: matchState.remainingTime });
    };
}
