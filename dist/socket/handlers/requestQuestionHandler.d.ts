import { CustomSocket, RequestCurrentQuestionPayload } from '../types.js';
export declare function handleRequestCurrentQuestion(socket: CustomSocket): ({ matchId: rawMatchId }: RequestCurrentQuestionPayload) => Promise<void>;
