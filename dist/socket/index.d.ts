import { Server } from 'socket.io';
import http from 'http';
import { RedisClientType } from 'redis';
export declare let redisClient: RedisClientType;
/**
 * Initialize Socket.IO server and set up all event handlers.
 */
export declare function initializeSocket(server: http.Server): Promise<Server>;
export * from './types.js';
export * from './constants.js';
