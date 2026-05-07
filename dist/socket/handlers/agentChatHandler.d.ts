import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
interface AgentChatPayload {
    message: string;
    sessionId?: number;
}
export declare const handleAgentChat: (io: Server, socket: CustomSocket) => (payload: AgentChatPayload) => Promise<void>;
export {};
