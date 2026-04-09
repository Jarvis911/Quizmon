import { Server, Socket } from 'socket.io';
import http from 'http';
import { createClient, RedisClientType } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { CustomSocket } from './types.js';
import { JwtPayload } from '../types/index.js';
import { REDIS_URL } from '../config/index.js';
import {
    handleJoinMatch,
    handleStartMatch,
    handleSubmitAnswer,
    handleEndMatch,
    handleDisconnect,
    handleRequestCurrentQuestion,
    handleUpdatePlayerInfo,
    handleUpdateMatchSettings,
    handleSurrender,
    handleLeaveMatch,
    handleCancelMatch,
    handleAgentChat,
    handleTogglePause,
    handleSkipQuestion,
} from './handlers/index.js';

export let redisClient: RedisClientType;

/**
 * Initialize Socket.IO server and set up all event handlers.
 */
export async function initializeSocket(server: http.Server): Promise<Server> {
    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST', 'PUT'],
        },
    });

    redisClient = createClient({ url: REDIS_URL }) as RedisClientType;
    const subClient = redisClient.duplicate();

    try {
        await Promise.all([redisClient.connect(), subClient.connect()]);
        io.adapter(createAdapter(redisClient, subClient));
        console.log('Redis connected and Socket.IO adapter configured');
    } catch (err) {
        console.error('Failed to connect to Redis:', err);
    }

    // Authentication Middleware
    io.use((socket, next) => {
        let token = socket.handshake.auth?.token;
        
        if (token) {
            // Strip "Bearer " prefix if present
            if (token.startsWith('Bearer ')) {
                token = token.slice(7);
            }

            try {
                const secret = process.env.JWT_SECRET as string;
                const decoded = jwt.verify(token, secret) as JwtPayload;
                (socket as CustomSocket).userId = decoded.id;
                console.log(`Socket ${socket.id} authenticated for user ${decoded.id}`);
            } catch (err) {
                console.warn(`Socket ${socket.id} authentication failed:`, (err as Error).message);
                // We don't call next(err) here because we want to allow the connection
                // anyway, but individual handlers will check for userId if needed.
            }
        }
        
        next();
    });

    io.on('connection', (socket: Socket) => {
        const customSocket = socket as CustomSocket;
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
        customSocket.on('agentChat', handleAgentChat(io, customSocket));
        customSocket.on('togglePause', handleTogglePause(io, customSocket));
        customSocket.on('skipQuestion', handleSkipQuestion(io, customSocket));
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
