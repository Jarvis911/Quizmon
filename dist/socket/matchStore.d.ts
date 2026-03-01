import { MatchState } from './types.js';
/**
 * Local memory store for fast interval management.
 * Intervals cannot be stored in Redis.
 */
export declare const matchIntervals: Map<string, NodeJS.Timeout>;
/**
 * Get a match state by its ID.
 */
export declare function getMatch(matchId: string): Promise<MatchState | undefined>;
/**
 * Check if a match exists.
 */
export declare function hasMatch(matchId: string): Promise<boolean>;
/**
 * Save or update a match state.
 */
export declare function saveMatch(matchId: string, matchState: MatchState): Promise<void>;
/**
 * Delete a match from the store.
 */
export declare function deleteMatch(matchId: string): Promise<void>;
/**
 * Get the match ID for a specific user.
 */
export declare function getUserMatch(userId: number): Promise<string | undefined>;
/**
 * Check if a user is already in a match.
 */
export declare function isUserInMatch(userId: number): Promise<boolean>;
/**
 * Associate a user with a match.
 */
export declare function setUserMatch(userId: number, matchId: string): Promise<void>;
/**
 * Remove user from match association.
 */
export declare function removeUserMatch(userId: number): Promise<void>;
/**
 * Get the current number of active matches.
 */
export declare function getActiveMatchCount(): Promise<number>;
