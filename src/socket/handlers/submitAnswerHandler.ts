import { Server } from 'socket.io';
import { CustomSocket, SubmitAnswerPayload } from '../types.js';
import { getMatch, saveMatch } from '../matchStore.js';
import { validateAnswer } from '../answerValidator.js';
import { processTimeUp } from '../gameTimer.js';

export function handleSubmitAnswer(io: Server, socket: CustomSocket) {
    return async ({ matchId, userId, questionId, answer }: SubmitAnswerPayload) => {
        const matchState = await getMatch(matchId);

        if (!matchState || matchState.state !== 'started') {
            return socket.emit('error', 'Trận đấu chưa bắt đầu hoặc đã kết thúc');
        }

        // Validate user is in match
        const player = matchState.players.find((p) => p.userId === userId);
        if (!player) {
            return socket.emit('error', 'Bạn không ở trong trận đấu này');
        }

        const currentQuestion = matchState.questions[matchState.currentQuestionIndex];
        if (!currentQuestion || currentQuestion.id !== questionId) {
            return socket.emit('error', 'Câu hỏi không hợp lệ');
        }

        // Check if already submitted
        if (player.submitted.has(questionId)) {
            return socket.emit('error', 'Bạn đã trả lời câu hỏi này');
        }

        // Check if time remaining > 0
        if (matchState.remainingTime <= 0) {
            return socket.emit('error', 'Đã hết thời gian trả lời');
        }

        // Validate answer format
        const validation = validateAnswer(currentQuestion, answer);
        if (!validation.isValid) {
            return socket.emit('error', validation.error || 'Định dạng câu trả lời không hợp lệ');
        }

        // Store the answer
        if (!matchState.answers.has(questionId)) {
            matchState.answers.set(questionId, new Map());
        }

        matchState.answers.get(questionId)!.set(userId, {
            answer: answer,
            submitRemainingTime: matchState.remainingTime,
        });

        player.submitted.add(questionId);

        await saveMatch(matchId, matchState);

        // Emit confirmation to user
        socket.emit('answerSubmitted', { questionId });

        // Check if all players submitted, if yes, early timeUp
        const allSubmitted = matchState.players.every((p) => p.submitted.has(questionId));
        if (allSubmitted) {
            console.log(`All players submitted for question ${questionId}. Processing time up.`);
            await processTimeUp(io, matchId);
        }
    };
}
