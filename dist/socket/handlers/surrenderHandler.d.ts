import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
export declare function handleSurrender(io: Server, socket: CustomSocket): ({ matchId }: {
    matchId: string;
}) => Promise<boolean | undefined>;
