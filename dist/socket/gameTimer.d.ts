import { Server } from 'socket.io';
/**
 * Start the question timer for a match.
 */
export declare function startQuestionTimer(io: Server, matchId: string): Promise<void>;
/**
 * Process time up for the current question.
 * Calculate scores and move to the next question.
 */
export declare function processTimeUp(io: Server, matchId: string): Promise<void>;
