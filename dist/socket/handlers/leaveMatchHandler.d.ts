import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
export declare function handleLeaveMatch(io: Server, socket: CustomSocket): ({ matchId: rawMatchId, userId: payloadUserId }: {
    matchId: string | number;
    userId?: number;
}) => Promise<boolean | undefined>;
