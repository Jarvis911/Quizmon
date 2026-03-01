import { CustomSocket, RequestCurrentQuestionPayload } from '../types.js';
export declare function handleRequestCurrentQuestion(socket: CustomSocket): ({ matchId }: RequestCurrentQuestionPayload) => Promise<void>;
