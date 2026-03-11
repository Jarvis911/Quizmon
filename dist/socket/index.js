import { Server } from 'socket.io';
import { createClient } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import { handleJoinMatch, handleStartMatch, handleSubmitAnswer, handleEndMatch, handleDisconnect, handleRequestCurrentQuestion, handleUpdatePlayerInfo, handleUpdateMatchSettings, handleSurrender, handleLeaveMatch, handleCancelMatch, } from './handlers/index.js';
export let redisClient;
/**
 * Initialize Socket.IO server and set up all event handlers.
 */
export async function initializeSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT'],
        },
    });
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = createClient({ url: redisUrl });
    const subClient = redisClient.duplicate();
    try {
        await Promise.all([redisClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(redisClient, subClient));
        console.log('Redis connected and Socket.IO adapter configured');
    }
    catch (err) {
        console.error('Failed to connect to Redis:', err);
    }
    io.on('connection', (socket) => {
        const customSocket = socket;
        console.log('Socket connected:', customSocket.id);
        // Register all event handlers
        customSocket.on('joinMatch', handleJoinMatch(io, customSocket));
        customSocket.on('startMatch', handleStartMatch(io, customSocket));
        customSocket.on('submitAnswer', handleSubmitAnswer(io, customSocket));
        customSocket.on('requestCurrentQuestion', handleRequestCurrentQuestion(customSocket));
        customSocket.on('endMatch', handleEndMatch(io, customSocket));
        customSocket.on('surrender', handleSurrender(io, customSocket));
        customSocket.on('leaveMatch', handleLeaveMatch(io, customSocket));
        customSocket.on('cancelMatch', handleCancelMatch(io, customSocket));
        customSocket.on('disconnect', handleDisconnect(io, customSocket));
        // Lobby customization events
        customSocket.on('updatePlayerInfo', handleUpdatePlayerInfo(io, customSocket));
        customSocket.on('updateMatchSettings', handleUpdateMatchSettings(io, customSocket));
    });
    return io;
}
// Re-export types for external use
export * from './types.js';
export * from './constants.js';
