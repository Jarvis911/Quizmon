import { Server } from 'socket.io';
import { CustomSocket, StartMatchPayload } from '../types.js';
export declare function handleStartMatch(io: Server, socket: CustomSocket): ({ matchId: rawMatchId }: StartMatchPayload) => Promise<boolean | undefined>;
export declare function sendNextQuestion(io: Server, matchId: string | number): Promise<void>;
