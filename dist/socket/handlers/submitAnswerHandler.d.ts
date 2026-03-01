import { Server } from 'socket.io';
import { CustomSocket, SubmitAnswerPayload } from '../types.js';
export declare function handleSubmitAnswer(io: Server, socket: CustomSocket): ({ matchId, userId, questionId, answer }: SubmitAnswerPayload) => Promise<boolean | undefined>;
