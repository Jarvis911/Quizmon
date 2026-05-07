import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
export declare function handleSurrender(io: Server, socket: CustomSocket): ({ matchId: rawMatchId }: {
    matchId: string | number;
}) => Promise<boolean | undefined>;
