import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
export declare function handleTogglePause(io: Server, socket: CustomSocket): ({ matchId: rawMatchId }: {
    matchId: string | number;
}) => Promise<boolean | undefined>;
