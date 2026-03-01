import { getMatch, saveMatch } from '../matchStore.js';
import { validateAnswer } from '../answerValidator.js';
import { processTimeUp } from '../gameTimer.js';
export function handleSubmitAnswer(io, socket) {
    return async ({ matchId, userId, questionId, answer }) => {
        const matchState = await getMatch(matchId);
        if (!matchState || matchState.state !== 'started') {
            return socket.emit('error', 'Invalid match state');
        }
        // Validate user is in match
        const player = matchState.players.find((p) => p.userId === userId);
        if (!player) {
            return socket.emit('error', 'Not in match');
        }
        const currentQuestion = matchState.questions[matchState.currentQuestionIndex];
        if (!currentQuestion || currentQuestion.id !== questionId) {
            return socket.emit('error', 'Invalid question');
        }
        // Check if already submitted
        const playerSubmittedSet = new Set(player.submitted); // Deserialize check
        if (playerSubmittedSet.has(questionId)) {
            return socket.emit('error', 'Already submitted for this question');
        }
        // Check if time remaining > 0
        if (matchState.remainingTime <= 0) {
            return socket.emit('error', 'Time up for this question');
        }
        // Validate answer format
        const validation = validateAnswer(currentQuestion, answer);
        if (!validation.isValid) {
            return socket.emit('error', validation.error || 'Invalid answer format');
        }
        // Store the answer
        if (!matchState.answers.has(questionId)) {
            matchState.answers.set(questionId, new Map());
        }
        matchState.answers.get(questionId).set(userId, {
            answer: answer,
            submitRemainingTime: matchState.remainingTime,
        });
        player.submitted = new Set(player.submitted).add(questionId);
        await saveMatch(matchId, matchState);
        // Emit confirmation to user
        socket.emit('answerSubmitted', { questionId });
        // Check if all players submitted, if yes, early timeUp
        const allSubmitted = matchState.players.every((p) => new Set(p.submitted).has(questionId));
        if (allSubmitted) {
            await processTimeUp(io, matchId);
        }
    };
}
