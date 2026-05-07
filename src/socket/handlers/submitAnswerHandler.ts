import { Server } from 'socket.io';
import { CustomSocket, SubmitAnswerPayload } from '../types.js';
import { getMatch, saveMatch, withMatchLock } from '../matchStore.js';
import { validateAnswer } from '../answerValidator.js';
import { processTimeUp } from '../gameTimer.js';
import { getTypeAnswerVerdict } from '../scoreCalculator.js';

export function handleSubmitAnswer(io: Server, socket: CustomSocket) {
    return async ({ matchId: rawMatchId, userId, questionId, answer }: SubmitAnswerPayload) => {
        const matchId = String(rawMatchId); // Normalize to string

        // Use withMatchLock to serialize concurrent submissions for the same match.
        // This prevents the "Lost Update" race condition where two players submitting
        // simultaneously overwrite each other's answer in Redis.
        let allSubmitted = false;
        let emitError: string | null = null;
        let immediateVerdict: 'correct' | 'near' | 'wrong' | null = null;

        await withMatchLock(matchId, async () => {
            // Re-read the FRESH state inside the lock — this is the authoritative read.
            const matchState = await getMatch(matchId);

            if (!matchState || matchState.state !== 'started') {
                emitError = 'Trận đấu chưa bắt đầu hoặc đã kết thúc';
                return;
            }

            // Validate user is in match
            const player = matchState.players.find((p) => p.userId === userId);
            if (!player) {
                emitError = 'Bạn không ở trong trận đấu này';
                return;
            }

            const currentQuestion = matchState.questions[matchState.currentQuestionIndex];
            if (!currentQuestion || currentQuestion.id !== questionId) {
                emitError = 'Câu hỏi không hợp lệ';
                return;
            }

            // Check if already submitted
            // TYPEANSWER supports multiple attempts until correct.
            if (player.submitted.has(questionId)) {
                emitError = currentQuestion.type === 'TYPEANSWER'
                    ? 'Bạn đã trả lời đúng câu hỏi này'
                    : 'Bạn đã trả lời câu hỏi này';
                return;
            }

            // Check if time remaining > 0
            if (matchState.remainingTime <= 0) {
                emitError = 'Đã hết thời gian trả lời';
                return;
            }

            // Validate answer format
            const answerValidation = validateAnswer(currentQuestion, answer);
            if (!answerValidation.isValid) {
                emitError = answerValidation.error || 'Định dạng câu trả lời không hợp lệ';
                return;
            }

            // For TYPEANSWER, compute verdict immediately (no need to wait for time-up).
            if (currentQuestion.type === 'TYPEANSWER') {
                immediateVerdict = getTypeAnswerVerdict(currentQuestion.data?.correctAnswer, answer as string);
                // Only lock submission if correct; near/wrong can retry.
                if (immediateVerdict === 'correct') {
                    player.submitted.add(questionId);
                }
            }

            // Store the answer
            if (!matchState.answers.has(questionId)) {
                matchState.answers.set(questionId, new Map());
            }

            matchState.answers.get(questionId)!.set(userId, {
                answer: answer,
                submitRemainingTime: matchState.remainingTime,
            });

            // For non-TYPEANSWER questions, a single submission locks the question.
            if (currentQuestion.type !== 'TYPEANSWER') {
                player.submitted.add(questionId);
            }

            // Save once — atomically within this lock
            await saveMatch(matchId, matchState);

            // Check if ALL players have now submitted
            // TYPEANSWER does not end early based on allSubmitted (players may retry).
            allSubmitted =
                currentQuestion.type === 'TYPEANSWER'
                    ? false
                    : matchState.players.every((p) => p.submitted.has(questionId));
        });

        if (emitError) {
            return socket.emit('error', emitError);
        }

        // Emit confirmation to user (outside the lock — no write needed)
        socket.emit('answerSubmitted', { questionId });

        // For TYPEANSWER, emit per-attempt verdict immediately (without revealing the correct answer).
        if (immediateVerdict) {
            io.to(String(matchId)).emit('answerResult', {
                userId,
                questionId,
                isCorrect: immediateVerdict === 'correct',
                verdict: immediateVerdict,
                phase: 'attempt',
            });
        }

        // If everyone answered, trigger early time-up (outside the lock to avoid deadlock)
        if (allSubmitted) {
            console.log(`All players submitted for question ${questionId}. Processing time up.`);
            await processTimeUp(io, matchId);
        }
    };
}

