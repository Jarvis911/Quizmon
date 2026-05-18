import { MatchState } from './types.js';
import { redisClient } from './index.js';

const MATCH_PREFIX = 'match:';
const USER_MATCH_PREFIX = 'userMatch:';
const MATCHES_SET_KEY = 'active_matches';

/**
 * Local memory store for fast interval management.
 * Intervals cannot be stored in Redis.
 */
export const matchIntervals = new Map<string, ReturnType<typeof setInterval>>();

/**
 * Local memory store for the *fresh* remaining time of a match.
 * Redis is only synced every 1s for performance, so when a player submits an
 * answer the value in Redis can be up to ~1s stale. We use this in-memory map
 * to award points based on the same value as the server's 100ms scoring tick
 * (clients receive `timeUpdate` less often and interpolate locally).
 */
export const matchRemainingTimes = new Map<string, number>();

/**
 * Tracks which question IDs already had `processTimeUp` run for a given match.
 * Prevents the race where the question timer hits 0 at the same moment the
 * last player submits — both paths would otherwise call `processTimeUp`,
 * causing double-awarded points, duplicate answerResult events, and a
 * double-increment of `currentQuestionIndex` (skipping a question).
 */
export const matchProcessedQuestions = new Map<string, Set<number>>();

/**
 * In-process pause flag mirrored from Redis when the host toggles pause.
 * Lets the question timer avoid a Redis GET on every tick; scoring still uses
 * Redis-backed state for persistence. Not shared across Node workers.
 */
const matchTimerPauseSync = new Map<string, boolean>();

export function setMatchTimerPause(matchId: string | number, isPaused: boolean): void {
    matchTimerPauseSync.set(String(matchId), isPaused);
}

export function getMatchTimerPause(matchId: string | number): boolean {
    return matchTimerPauseSync.get(String(matchId)) ?? false;
}

export function clearMatchTimerPause(matchId: string | number): void {
    matchTimerPauseSync.delete(String(matchId));
}

/**
 * Per-match async mutex.
 * Serializes concurrent operations on the same match to prevent
 * "Read-Modify-Write" race conditions (e.g. two players submitting simultaneously).
 */
const matchLocks = new Map<string, Promise<any>>();

export async function withMatchLock<T>(
    matchId: string | number,
    fn: () => Promise<T>
): Promise<T> {
    const key = String(matchId);
    // Chain the new operation after the previous one finishes
    const chain = (matchLocks.get(key) ?? Promise.resolve())
        .then(() => fn())
        .finally(() => {
            if (matchLocks.get(key) === chain) {
                matchLocks.delete(key);
            }
        });
    matchLocks.set(key, chain);
    return chain;
}

/**
 * Custom JSON Replacer for Map, Set, and Date serialization
 */
function replacer(key: string, value: any) {
    if (value instanceof Map) {
        return { dataType: 'Map', value: Array.from(value.entries()) };
    }
    if (value instanceof Set) {
        return { dataType: 'Set', value: Array.from(value) };
    }
    return value;
}

/**
 * Custom JSON Reviver for Map, Set, and Date deserialization
 */
function reviver(key: string, value: any) {
    if (typeof value === 'object' && value !== null) {
        if (value.dataType === 'Map') {
            return new Map(value.value);
        }
        if (value.dataType === 'Set') {
            return new Set(value.value);
        }
    }
    if (['startTime', 'endTime'].includes(key) && typeof value === 'string') {
        return new Date(value);
    }
    return value;
}

/**
 * Get a match state by its ID.
 */
export async function getMatch(matchId: string | number): Promise<MatchState | undefined> {
    const data = await redisClient.get(MATCH_PREFIX + matchId);
    if (!data) return undefined;
    return JSON.parse(data, reviver) as MatchState;
}

/**
 * Check if a match exists.
 */
export async function hasMatch(matchId: string | number): Promise<boolean> {
    const exists = await redisClient.exists(MATCH_PREFIX + matchId);
    return exists > 0;
}

/**
 * Save or update a match state.
 */
export async function saveMatch(matchId: string | number, matchState: MatchState): Promise<void> {
    const serialized = JSON.stringify(matchState, replacer);
    await redisClient.set(MATCH_PREFIX + matchId, serialized);
    await redisClient.sAdd(MATCHES_SET_KEY, String(matchId));
}

/**
 * Perform an atomic update on a match state.
 * This is a helper to prevent "Read-Modify-Write" race conditions.
 */
export async function updateMatchState(
    matchId: string | number, 
    updateFn: (state: MatchState) => MatchState | Promise<MatchState>
): Promise<MatchState | undefined> {
    const matchState = await getMatch(matchId);
    if (!matchState) return undefined;
    
    const updatedState = await updateFn(matchState);
    await saveMatch(matchId, updatedState);
    return updatedState;
}

/**
 * Delete a match from the store.
 */
export async function deleteMatch(matchId: string | number): Promise<void> {
    await redisClient.del(MATCH_PREFIX + matchId);
    await redisClient.sRem(MATCHES_SET_KEY, String(matchId));

    // Clean up local interval if exists
    const key = String(matchId);
    const interval = matchIntervals.get(key);
    if (interval) {
        clearInterval(interval);
        matchIntervals.delete(key);
    }
    matchRemainingTimes.delete(key);
    matchProcessedQuestions.delete(key);
    matchTimerPauseSync.delete(key);
}

/**
 * Get the match ID for a specific user.
 */
export async function getUserMatch(userId: number): Promise<string | undefined> {
    const matchId = await redisClient.get(USER_MATCH_PREFIX + userId);
    return matchId || undefined;
}

/**
 * Check if a user is already in a match.
 */
export async function isUserInMatch(userId: number): Promise<boolean> {
    const exists = await redisClient.exists(USER_MATCH_PREFIX + userId);
    return exists > 0;
}

/**
 * Associate a user with a match.
 */
export async function setUserMatch(userId: number, matchId: string | number): Promise<void> {
    await redisClient.set(USER_MATCH_PREFIX + userId, String(matchId));
}

/**
 * Remove user from match association.
 */
export async function removeUserMatch(userId: number): Promise<void> {
    await redisClient.del(USER_MATCH_PREFIX + userId);
}

/**
 * Get the current number of active matches.
 */
export async function getActiveMatchCount(): Promise<number> {
    const count = await redisClient.sCard(MATCHES_SET_KEY);
    return count;
}
