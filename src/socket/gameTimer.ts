import { Server } from 'socket.io';
import { getMatch, saveMatch, matchIntervals } from './matchStore.js';
import { checkAnswer, calculatePoints } from './scoreCalculator.js';
import { QUESTION_TIME_LIMIT, TIME_UPDATE_INTERVAL_MS, NEXT_QUESTION_DELAY_MS } from './constants.js';

/**
 * Start the question timer for a match.
 */
export async function startQuestionTimer(io: Server, matchId: string): Promise<void> {
    const matchState = await getMatch(matchId);
    if (!matchState) return;

    matchState.remainingTime = QUESTION_TIME_LIMIT;
    await saveMatch(matchId, matchState);

    io.to(matchId).emit('timeUpdate', matchState.remainingTime);

    const intervalId = setInterval(async () => {
        // Fetch fresh state inside interval
        const currentMatchState = await getMatch(matchId);
        if (!currentMatchState) {
            clearInterval(intervalId);
            matchIntervals.delete(matchId);
            return;
        }

        currentMatchState.remainingTime = Math.max(0, currentMatchState.remainingTime - 0.1);
        await saveMatch(matchId, currentMatchState);

        io.to(matchId).emit('timeUpdate', Number(currentMatchState.remainingTime.toFixed(1)));

        if (currentMatchState.remainingTime <= 0) {
            clearInterval(intervalId);
            matchIntervals.delete(matchId);
            await processTimeUp(io, matchId);
        }
    }, TIME_UPDATE_INTERVAL_MS);

    matchIntervals.set(matchId, intervalId);
}

/**
 * Process time up for the current question.
 * Calculate scores and move to the next question.
 */
export async function processTimeUp(io: Server, matchId: string): Promise<void> {
    const matchState = await getMatch(matchId);
    if (!matchState) return;

    // Clear timer if still running
    const interval = matchIntervals.get(matchId);
    if (interval) {
        clearInterval(interval);
        matchIntervals.delete(matchId);
    }

    const question = matchState.questions[matchState.currentQuestionIndex];
    if (!question) return;

    const questionId = question.id;
    const answersMap = matchState.answers.get(questionId) || new Map();

    // Process each player's answer
    for (const player of matchState.players) {
        const entry = answersMap.get(player.userId);
        const answer = entry?.answer;
        const submitRemainingTime = entry ? entry.submitRemainingTime : 0;

        const result = checkAnswer(question, answer);

        // Award points if correct
        if (result.isCorrect) {
            player.score += calculatePoints(submitRemainingTime);
        }

        // Emit result (with correct location for LOCATION type)
        if (question.type === 'LOCATION') {
            io.to(matchId).emit('answerResult', {
                userId: player.userId,
                isCorrect: result.isCorrect,
                questionId,
                correctLatLon: result.correctLatLon,
            });
        } else {
            io.to(matchId).emit('answerResult', {
                userId: player.userId,
                isCorrect: result.isCorrect,
                questionId,
            });
        }
    }

    // Reset submitted flags for all players
    matchState.players.forEach((p) => (p.submitted = new Set()));

    await saveMatch(matchId, matchState);

    // Emit updated scores
    io.to(matchId).emit(
        'updatedScores',
        matchState.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            score: p.score,
        }))
    );

    // Move to next question after delay
    setTimeout(() => {
        // Run as an async IIFE
        (async () => {
            const freshState = await getMatch(matchId);
            if (!freshState) return;
            freshState.currentQuestionIndex++;
            await saveMatch(matchId, freshState);

            // Import dynamically to avoid circular dependency
            const { sendNextQuestion } = await import('./handlers/startMatchHandler.js');
            await sendNextQuestion(io, matchId);
        })().catch(err => console.error("Error moving to next question:", err));
    }, NEXT_QUESTION_DELAY_MS);
}
