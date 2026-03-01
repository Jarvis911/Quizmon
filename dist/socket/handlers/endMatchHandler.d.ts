import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
export declare function endMatch(io: Server, matchId: string): Promise<void>;
export declare function handleEndMatch(io: Server, socket: CustomSocket): ({ matchId }: {
    matchId: string;
}) => Promise<boolean | undefined>;
