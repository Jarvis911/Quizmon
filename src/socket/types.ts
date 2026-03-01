import { Socket } from 'socket.io';

export interface Player {
    userId: number;
    username: string;
    displayName: string;
    avatarUrl: string | null;
    score: number;
    submitted: Set<number>;
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
    options: { isCorrect?: boolean; order?: number; text: string }[];
    range?: { minValue: number; maxValue: number; correctValue: number };
    typeAnswer?: { correctAnswer: string };
    location?: { correctLatitude: number; correctLongitude: number };
}

export type AnswerType = number | number[] | boolean[] | string | { lat: number; lon: number };

export interface CustomSocket extends Socket {
    matchId?: string;
    userId?: number;
}

// Event payload types
export interface JoinMatchPayload {
    matchId: string;
    userId: number;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export interface UpdatePlayerInfoPayload {
    matchId: string;
    userId: number;
    displayName: string;
    avatarUrl: string | null;
}

export interface UpdateMatchSettingsPayload {
    matchId: string;
    timePerQuestion: number | null;
    musicUrl: string | null;
    backgroundUrl: string | null;
}

export interface StartMatchPayload {
    matchId: string;
}

export interface SubmitAnswerPayload {
    matchId: string;
    userId: number;
    questionId: number;
    answer: AnswerType;
}

export interface RequestCurrentQuestionPayload {
    matchId: string;
}

export interface EndMatchPayload {
    matchId: string;
}
