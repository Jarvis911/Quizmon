import { Socket } from 'socket.io';

export interface Player {
    userId: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    score: number;
    submitted: Set<number>;
    disconnected?: boolean;
    socketId?: string;
}

export interface MatchState {
    state: 'waiting' | 'started' | 'ended';
    hostId: number;
    players: Player[];
    currentQuestionIndex: number;
    questions: Question[];
    remainingTime: number;
    startTime: Date | null;
    endTime: Date | null;
    answers: Map<number, Map<number, { answer: AnswerType; submitRemainingTime: number }>>;
}

export interface Question {
    id: number;
    type: string;
    options: { id: number; isCorrect?: boolean; order?: number; text: string }[];
    data?: {
        minValue?: number; maxValue?: number; correctValue?: number;  // RANGE
        correctAnswer?: string;                                       // TYPEANSWER
        correctLatitude?: number; correctLongitude?: number;           // LOCATION
        radius1000?: number; radius750?: number; radius500?: number;  // LOCATION Scoring
        mapType?: 'SIMPLE' | 'SATELLITE';                             // LOCATION Style
    } | null;
}

export type AnswerType = number | number[] | boolean[] | string | { lat: number; lon: number };

export interface CustomSocket extends Socket {
    matchId?: string | number;
    userId?: number;
}

// Event payload types
export interface JoinMatchPayload {
    matchId: string | number;
    userId: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export interface UpdatePlayerInfoPayload {
    matchId: string | number;
    userId: number;
    displayName: string;
    avatarUrl: string | null;
}

export interface UpdateMatchSettingsPayload {
    matchId: string | number;
    timePerQuestion: number | null;
    musicUrl: string | null;
    backgroundUrl: string | null;
}

export interface StartMatchPayload {
    matchId: string | number;
}

export interface SubmitAnswerPayload {
    matchId: string | number;
    userId: number;
    questionId: number;
    answer: AnswerType;
}

export interface RequestCurrentQuestionPayload {
    matchId: string | number;
}

export interface EndMatchPayload {
    matchId: string | number;
}
