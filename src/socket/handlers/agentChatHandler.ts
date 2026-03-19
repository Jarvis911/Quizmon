import { Server, Socket } from 'socket.io';
import { CustomSocket } from '../types.js';
import { processAgentChat } from '../../services/aiService.js';

interface AgentChatPayload {
    message: string;
}

export const handleAgentChat = (io: Server, socket: CustomSocket) => {
    // In-memory history for this socket session
    const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

    return async (payload: AgentChatPayload) => {
        try {
            const { message } = payload;
            
            // Add user message to history
            const userMsg = { role: 'user' as const, parts: [{ text: message }] };
            
            // Call AI service
            const quizUpdate = await processAgentChat(history, message);
            
            // Update history with user message AND model response
            // Note: We add user message AFTER the call to avoid sending it twice in the same request 
            // but we need it for future calls.
            history.push(userMsg);
            history.push({ role: 'model', parts: [{ text: JSON.stringify(quizUpdate) }] });

            // Emit update to the client
            socket.emit('agentUpdate', quizUpdate);
        } catch (error: any) {
            console.error('[Agent Chat Error]:', error);
            socket.emit('error', { message: 'Agent failed to respond: ' + error.message });
        }
    };
};
