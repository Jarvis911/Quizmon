import { Server } from 'socket.io';
import {
    getMatch,
    saveMatch,
    matchIntervals,
    matchRemainingTimes,
    matchProcessedQuestions,
    withMatchLock,
    setMatchTimerPause,
    getMatchTimerPause,
} from './matchStore.js';
import { checkAnswer, calculatePoints, getTypeAnswerVerdict } from './scoreCalculator.js';
import {
    TIME_UPDATE_INTERVAL_MS,
    TIME_BROADCAST_INTERVAL_MS,
    NEXT_QUESTION_DELAY_MS,
} from './constants.js';

/**
 * Start the question timer for a match.
 */
export async function startQuestionTimer(io: Server, matchId: string | number): Promise<void> {
    const matchState = await getMatch(matchId);
    if (!matchState) return;

    const key = String(matchId);

    // Clear any existing interval for this match to prevent leaks/double timers
    const existingInterval = matchIntervals.get(key);
    if (existingInterval) {
        clearInterval(existingInterval);
        matchIntervals.delete(key);
    }

    matchState.remainingTime = matchState.timePerQuestion;
    await saveMatch(matchId, matchState);

    setMatchTimerPause(matchId, matchState.isPaused);

    // Seed the in-memory accurate remaining time. submitAnswerHandler reads this
    // (not Redis) so the score awarded matches the value last shown to clients.
    matchRemainingTimes.set(key, matchState.timePerQuestion);

    io.to(key).emit('timeUpdate', matchState.remainingTime);

    let localRemainingTime = matchState.timePerQuestion;
    let tickCount = 0;
    let msSinceBroadcast = 0;
    let pauseHoldWritten = false;

    const intervalId = setInterval(async () => {
        const isPaused = getMatchTimerPause(matchId);

        // Host paused: freeze countdown and persist remaining time once (avoid Redis spam).
        if (isPaused) {
            const frozen = Number(localRemainingTime.toFixed(1));
            matchRemainingTimes.set(key, frozen);
            if (!pauseHoldWritten) {
                pauseHoldWritten = true;
                const currentMatchState = await getMatch(matchId);
                if (!currentMatchState) {
                    clearInterval(intervalId);
                    matchIntervals.delete(key);
                    matchRemainingTimes.delete(key);
                    return;
                }
                currentMatchState.remainingTime = frozen;
                await saveMatch(matchId, currentMatchState);
            }
            return;
        }

        pauseHoldWritten = false;

        // Decrement local timer
        localRemainingTime = Math.max(0, localRemainingTime - 0.1);
        tickCount++;

        const broadcastValue = Number(localRemainingTime.toFixed(1));
        // Store the value we are about to broadcast so submissions get scored
        // against exactly what the client just saw.
        matchRemainingTimes.set(key, broadcastValue);

        msSinceBroadcast += TIME_UPDATE_INTERVAL_MS;
        if (msSinceBroadcast >= TIME_BROADCAST_INTERVAL_MS) {
            msSinceBroadcast = 0;
            io.to(key).emit('timeUpdate', broadcastValue);
        }

        // Sync local time back to Redis every 1s (10 ticks) or when time is up
        if (tickCount >= 10 || localRemainingTime <= 0) {
            tickCount = 0;
            const currentMatchState = await getMatch(matchId);
            if (!currentMatchState) {
                clearInterval(intervalId);
                matchIntervals.delete(key);
                matchRemainingTimes.delete(key);
                return;
            }
            currentMatchState.remainingTime = localRemainingTime;
            await saveMatch(matchId, currentMatchState);
        }

        if (localRemainingTime <= 0) {
            io.to(key).emit('timeUpdate', 0);
            clearInterval(intervalId);
            matchIntervals.delete(key);
            await processTimeUp(io, matchId);
        }
    }, TIME_UPDATE_INTERVAL_MS);

    matchIntervals.set(key, intervalId);
}

/**
 * Skip current question and move to next one immediately (no points awarded).
 */
export async function skipToNextQuestion(io: Server, matchId: string | number): Promise<void> {
    const key = String(matchId);

    // Use the match lock so we don't race with a concurrent processTimeUp or submitAnswer.
    await withMatchLock(matchId, async () => {
        const matchState = await getMatch(matchId);
        if (!matchState) return;

        // Clear timer if still running
        const interval = matchIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            matchIntervals.delete(key);
        }

        // Mark the current question as processed so any late submission / timer
        // tick that slips in cannot trigger processTimeUp afterwards.
        const skippedQuestion = matchState.questions[matchState.currentQuestionIndex];
        if (skippedQuestion) {
            let processedSet = matchProcessedQuestions.get(key);
            if (!processedSet) {
                processedSet = new Set();
                matchProcessedQuestions.set(key, processedSet);
            }
            processedSet.add(skippedQuestion.id);
        }

        // Reset submitted flags for all players
        matchState.players.forEach((p) => (p.submitted = new Set()));
        matchState.isPaused = false; // Reset pause state when moving to next question

        matchState.currentQuestionIndex++;
        await saveMatch(matchId, matchState);
    });

    // Import dynamically to avoid circular dependency
    const { sendNextQuestion } = await import('./handlers/startMatchHandler.js');
    await sendNextQuestion(io, matchId);
}

/**
 * Process time up for the current question.
 * Calculate scores and move to the next question.
 *
 * This runs inside the per-match lock so concurrent callers (timer hitting 0 +
 * last player submitting) cannot both award points or both advance the
 * question index. A `processedQuestions` Set guarantees idempotency.
 */
export async function processTimeUp(io: Server, matchId: string | number): Promise<void> {
    const key = String(matchId);

    // Capture work to do *after* the lock releases (emitting events, scheduling
    // next question). Doing IO inside the lock is fine but we want a single
    // exit point if the question was already processed.
    let questionToReveal: number | null = null;
    let revealPayloads: any[] = [];
    let updatedScoresPayload: any[] | null = null;

    await withMatchLock(matchId, async () => {
        const matchState = await getMatch(matchId);
        if (!matchState) return;

        const question = matchState.questions[matchState.currentQuestionIndex];
        if (!question) return;

        const questionId = question.id;

        // Idempotency guard: if this question has already been processed (e.g.
        // by the timer interval), the second caller bails out cleanly here.
        let processedSet = matchProcessedQuestions.get(key);
        if (!processedSet) {
            processedSet = new Set();
            matchProcessedQuestions.set(key, processedSet);
        }
        if (processedSet.has(questionId)) {
            return;
        }
        processedSet.add(questionId);

        // Clear timer if still running
        const interval = matchIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            matchIntervals.delete(key);
        }

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

            revealPayloads.push({
                userId: player.userId,
                isCorrect: result.isCorrect,
                questionId,
                correctAnswer,
                verdict: question.type === 'TYPEANSWER'
                    ? getTypeAnswerVerdict(question.data?.correctAnswer, typeof answer === 'string' ? answer : '')
                    : (result.isCorrect ? 'correct' : 'wrong'),
                ...(question.type === 'TYPEANSWER' && { phase: 'reveal' }),
                ...(question.type === 'LOCATION' && { correctLatLon: result.correctLatLon }),
            });
        }

        // Reset submitted flags for all players
        matchState.players.forEach((p) => (p.submitted = new Set()));

        await saveMatch(matchId, matchState);

        questionToReveal = questionId;
        updatedScoresPayload = matchState.players.map((p) => ({
            userId: p.userId,
            username: p.username,
            score: p.score,
        }));
    });

    // If the guard bailed out, do nothing.
    if (questionToReveal === null) return;

    // Emit results & updated scores outside the lock.
    for (const payload of revealPayloads) {
        io.to(key).emit('answerResult', payload);
    }
    if (updatedScoresPayload) {
        io.to(key).emit('updatedScores', updatedScoresPayload);
    }

    // Move to next question after delay
    setTimeout(() => {
        (async () => {
            await withMatchLock(matchId, async () => {
                const freshState = await getMatch(matchId);
                if (!freshState) return;
                freshState.currentQuestionIndex++;
                await saveMatch(matchId, freshState);
            });

            // Import dynamically to avoid circular dependency
            const { sendNextQuestion } = await import('./handlers/startMatchHandler.js');
            await sendNextQuestion(io, matchId);
        })().catch(err => console.error("Error moving to next question:", err));
    }, NEXT_QUESTION_DELAY_MS);
}
