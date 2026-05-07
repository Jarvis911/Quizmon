import { redisClient } from './index.js';
const MATCH_PREFIX = 'match:';
const USER_MATCH_PREFIX = 'userMatch:';
const MATCHES_SET_KEY = 'active_matches';
/**
 * Local memory store for fast interval management.
 * Intervals cannot be stored in Redis.
 */
export const matchIntervals = new Map();
/**
 * Per-match async mutex.
 * Serializes concurrent operations on the same match to prevent
 * "Read-Modify-Write" race conditions (e.g. two players submitting simultaneously).
 */
const matchLocks = new Map();
export async function withMatchLock(matchId, fn) {
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
function replacer(key, value) {
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
function reviver(key, value) {
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
export async function getMatch(matchId) {
    const data = await redisClient.get(MATCH_PREFIX + matchId);
    if (!data)
        return undefined;
    return JSON.parse(data, reviver);
}
/**
 * Check if a match exists.
 */
export async function hasMatch(matchId) {
    const exists = await redisClient.exists(MATCH_PREFIX + matchId);
    return exists > 0;
}
/**
 * Save or update a match state.
 */
export async function saveMatch(matchId, matchState) {
    const serialized = JSON.stringify(matchState, replacer);
    await redisClient.set(MATCH_PREFIX + matchId, serialized);
    await redisClient.sAdd(MATCHES_SET_KEY, String(matchId));
}
/**
 * Perform an atomic update on a match state.
 * This is a helper to prevent "Read-Modify-Write" race conditions.
 */
export async function updateMatchState(matchId, updateFn) {
    const matchState = await getMatch(matchId);
    if (!matchState)
        return undefined;
    const updatedState = await updateFn(matchState);
    await saveMatch(matchId, updatedState);
    return updatedState;
}
/**
 * Delete a match from the store.
 */
export async function deleteMatch(matchId) {
    await redisClient.del(MATCH_PREFIX + matchId);
    await redisClient.sRem(MATCHES_SET_KEY, String(matchId));
    // Clean up local interval if exists
    const interval = matchIntervals.get(String(matchId));
    if (interval) {
        clearInterval(interval);
        matchIntervals.delete(String(matchId));
    }
}
/**
 * Get the match ID for a specific user.
 */
export async function getUserMatch(userId) {
    const matchId = await redisClient.get(USER_MATCH_PREFIX + userId);
    return matchId || undefined;
}
/**
 * Check if a user is already in a match.
 */
export async function isUserInMatch(userId) {
    const exists = await redisClient.exists(USER_MATCH_PREFIX + userId);
    return exists > 0;
}
/**
 * Associate a user with a match.
 */
export async function setUserMatch(userId, matchId) {
    await redisClient.set(USER_MATCH_PREFIX + userId, String(matchId));
}
/**
 * Remove user from match association.
 */
export async function removeUserMatch(userId) {
    await redisClient.del(USER_MATCH_PREFIX + userId);
}
/**
 * Get the current number of active matches.
 */
export async function getActiveMatchCount() {
    const count = await redisClient.sCard(MATCHES_SET_KEY);
    return count;
}
