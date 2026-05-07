/**
 * Delete quiz and all questions with options/media first (FK constraints).
 * MatchAnswer rows cascade when Question is deleted (schema onDelete: Cascade).
 */
export declare function deleteQuizCascade(quizId: number): Promise<void>;
