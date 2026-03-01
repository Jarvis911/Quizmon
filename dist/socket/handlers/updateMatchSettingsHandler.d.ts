import { Server } from 'socket.io';
import { CustomSocket, UpdateMatchSettingsPayload } from '../types.js';
export declare function handleUpdateMatchSettings(io: Server, socket: CustomSocket): ({ matchId, timePerQuestion, musicUrl, backgroundUrl }: UpdateMatchSettingsPayload) => Promise<boolean | undefined>;
