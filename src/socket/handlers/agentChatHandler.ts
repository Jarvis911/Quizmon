import { Server } from 'socket.io';
import { CustomSocket } from '../types.js';
import { processAgentChat } from '../../services/aiService.js';
import prisma from '../../prismaClient.js';

interface AgentChatPayload {
    message: string;
    sessionId?: number;
}

export const handleAgentChat = (io: Server, socket: CustomSocket) => {
    return async (payload: AgentChatPayload) => {
        try {
            const { message, sessionId: incomingSessionId } = payload;
            const userId = Number(socket.userId);

            if (!userId) {
                socket.emit('error', { message: 'Bạn chưa đăng nhập.' });
                return;
            }

            let sessionId = incomingSessionId;
            let history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

            // 1. Load or Create Session
            if (sessionId) {
                const session = await prisma.agentChatSession.findFirst({
                    where: { id: sessionId, userId: userId },
                    include: { messages: { orderBy: { createdAt: 'asc' } } }
                });

                if (session) {
                    // Map DB messages to Gemini format
                    history = session.messages.map(m => ({
                        role: m.role as 'user' | 'model',
                        parts: [{ text: m.text }]
                    }));
                } else {
                    // Session not found, reset to new
                    sessionId = undefined;
                }
            }

            // 2. Create new session if still no ID
            if (!sessionId) {
                // Determine a title from first message (roughly)
                const firstTitle = message.length > 30 ? message.substring(0, 27) + '...' : message;
                const newSession = await prisma.agentChatSession.create({
                    data: {
                        userId: userId,
                        title: firstTitle || "Cuộc hội thoại mới",
                    }
                });
                sessionId = newSession.id;
            }

            // 3. Save User Message to DB
            await prisma.agentChatMessage.create({
                data: {
                    sessionId: sessionId,
                    role: 'user',
                    text: message
                }
            });

            // 4. Call AI service with current history (Gemini will append the user message internally often, but here we pass history)
            // Note: Gemini's processAgentChat expects history WITHOUT the latest message which is passed as second argument
            const quizUpdate = await processAgentChat(history, message);

            // 5. Save Model Response to DB
            const modelMsgText = JSON.stringify(quizUpdate);
            await prisma.agentChatMessage.create({
                data: {
                    sessionId: sessionId,
                    role: 'model',
                    text: modelMsgText
                }
            });

            // 6. Update session updatedAt
            await prisma.agentChatSession.update({
                where: { id: sessionId },
                data: { updatedAt: new Date() }
            });

            // 7. Emit update to the client with sessionId
            socket.emit('agentUpdate', { ...quizUpdate, sessionId });
            
        } catch (error: any) {
            console.error('[Agent Chat Error]:', error);
            socket.emit('error', { message: 'Agent failed to respond: ' + error.message });
        }
    };
};
