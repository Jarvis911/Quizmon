import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
export declare function endMatch(io: Server, matchId: string | number): Promise<void>;
export declare function handleEndMatch(io: Server, socket: CustomSocket): ({ matchId: rawMatchId }: {
    matchId: string | number;
}) => Promise<boolean | undefined>;
