import { Server } from 'socket.io';
import { getMatch, saveMatch, matchIntervals } from './matchStore.js';
import { checkAnswer, calculatePoints } from './scoreCalculator.js';
import { QUESTION_TIME_LIMIT, TIME_UPDATE_INTERVAL_MS, NEXT_QUESTION_DELAY_MS } from './constants.js';

/**
 * Start the question timer for a match.
 */
export async function startQuestionTimer(io: Server, matchId: string | number): Promise<void> {
    const matchState = await getMatch(matchId);
    if (!matchState) return;

    // Clear any existing interval for this match to prevent leaks/double timers
    const existingInterval = matchIntervals.get(String(matchId));
    if (existingInterval) {
        clearInterval(existingInterval);
        matchIntervals.delete(String(matchId));
    }

    matchState.remainingTime = matchState.timePerQuestion;
    await saveMatch(matchId, matchState);

    io.to(String(matchId)).emit('timeUpdate', matchState.remainingTime);

    let localRemainingTime = matchState.timePerQuestion;
    let tickCount = 0;
    
    const intervalId = setInterval(async () => {
        // Fetch fresh state inside interval to check for external updates (like isPaused)
        const currentMatchState = await getMatch(matchId);
        if (!currentMatchState) {
            clearInterval(intervalId);
            matchIntervals.delete(String(matchId));
            return;
        }

        // Handle pause: if paused, we sync our local timer to Redis to be safe
        if (currentMatchState.isPaused) {
            currentMatchState.remainingTime = localRemainingTime;
            await saveMatch(matchId, currentMatchState);
            return;
        }

        // Decrement local timer
        localRemainingTime = Math.max(0, localRemainingTime - 0.1);
        tickCount++;

        // Broadcast the local (accurate) time to clients
        io.to(String(matchId)).emit('timeUpdate', Number(localRemainingTime.toFixed(1)));

        // Sync local time back to Redis every 1s (10 ticks) or when time is up
        if (tickCount >= 10 || localRemainingTime <= 0) {
            tickCount = 0;
            currentMatchState.remainingTime = localRemainingTime;
            await saveMatch(matchId, currentMatchState);
        }

        if (localRemainingTime <= 0) {
            clearInterval(intervalId);
            matchIntervals.delete(String(matchId));
            await processTimeUp(io, matchId);
        }
    }, TIME_UPDATE_INTERVAL_MS);

    matchIntervals.set(String(matchId), intervalId);
}

/**
 * Skip current question and move to next one immediately (no points awarded).
 */
export async function skipToNextQuestion(io: Server, matchId: string | number): Promise<void> {
    const matchState = await getMatch(matchId);
    if (!matchState) return;

    // Clear timer if still running
    const interval = matchIntervals.get(String(matchId));
    if (interval) {
        clearInterval(interval);
        matchIntervals.delete(String(matchId));
    }

    // Reset submitted flags for all players
    matchState.players.forEach((p) => (p.submitted = new Set()));
    matchState.isPaused = false; // Reset pause state when moving to next question

    matchState.currentQuestionIndex++;
    await saveMatch(matchId, matchState);

    // Import dynamically to avoid circular dependency
    const { sendNextQuestion } = await import('./handlers/startMatchHandler.js');
    await sendNextQuestion(io, matchId);
}

/**
 * Process time up for the current question.
 * Calculate scores and move to the next question.
 */
export async function processTimeUp(io: Server, matchId: string | number): Promise<void> {
    const matchState = await getMatch(matchId);
    if (!matchState) return;

    // Clear timer if still running
    const interval = matchIntervals.get(String(matchId));
    if (interval) {
        clearInterval(interval);
        matchIntervals.delete(String(matchId));
    }

    const question = matchState.questions[matchState.currentQuestionIndex];
    if (!question) return;

    const questionId = question.id;
    const answersMap = matchState.answers.get(questionId) || new Map();

    // Get correct answer for each type
    let correctAnswer: any = null;
    switch (question.type) {
        case 'BUTTONS':
            correctAnswer = question.options.findIndex((o) => o.isCorrect);
            break;
        case 'CHECKBOXES':
            correctAnswer = question.options
                .map((o, idx) => (o.isCorrect ? idx : null))
                .filter((idx) => idx !== null);
            break;
        case 'REORDER':
            correctAnswer = [...question.options]
                .sort((a, b) => (a.order || 0) - (b.order || 0))
                .map((o) => o.id);
            break;
        case 'TYPEANSWER':
            correctAnswer = question.data?.correctAnswer;
            break;
        case 'LOCATION':
            correctAnswer = {
                latitude: question.data?.correctLatitude,
                longitude: question.data?.correctLongitude,
            };
            break;
    }

    // Process each player's answer
    for (const player of matchState.players) {
        const entry = answersMap.get(player.userId);
        const answer = entry?.answer;
        const submitRemainingTime = entry ? entry.submitRemainingTime : 0;

        const result = checkAnswer(question, answer);

        // Award points if correct
        if (result.isCorrect) {
            player.score += calculatePoints(submitRemainingTime, matchState.timePerQuestion);
        }

        // Emit result (with correct answer info)
        io.to(String(matchId)).emit('answerResult', {
            userId: player.userId,
            isCorrect: result.isCorrect,
            questionId,
            correctAnswer, // Send the correct answer here
            ...(question.type === 'LOCATION' && { correctLatLon: result.correctLatLon }),
        });
    }

    // Reset submitted flags for all players
    matchState.players.forEach((p) => (p.submitted = new Set()));

    await saveMatch(matchId, matchState);

    // Emit updated scores
    io.to(String(matchId)).emit(
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
