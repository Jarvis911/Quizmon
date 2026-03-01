import { Server } from 'socket.io';
import { CustomSocket, UpdatePlayerInfoPayload } from '../types.js';
export declare function handleUpdatePlayerInfo(io: Server, socket: CustomSocket): ({ matchId, userId, displayName, avatarUrl }: UpdatePlayerInfoPayload) => Promise<boolean | undefined>;
