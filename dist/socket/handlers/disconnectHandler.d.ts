import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
export declare function handleDisconnect(io: Server, socket: CustomSocket): () => Promise<void>;
