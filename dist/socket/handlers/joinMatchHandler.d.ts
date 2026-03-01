import { Server } from 'socket.io';
import { CustomSocket, JoinMatchPayload } from '../types.js';
export declare function handleJoinMatch(io: Server, socket: CustomSocket): ({ matchId, userId, username, displayName, avatarUrl }: JoinMatchPayload) => Promise<boolean | undefined>;
