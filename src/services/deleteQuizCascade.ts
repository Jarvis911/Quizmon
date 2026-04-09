import prisma from '../prismaClient.js';

/**
 * Delete quiz and all questions with options/media first (FK constraints).
 * MatchAnswer rows cascade when Question is deleted (schema onDelete: Cascade).
 */
export async function deleteQuizCascade(quizId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
        const questions = await tx.question.findMany({
            where: { quizId },
            select: { id: true },
        });
        const ids = questions.map((q) => q.id);
        if (ids.length > 0) {
            await tx.questionOption.deleteMany({ where: { questionId: { in: ids } } });
            await tx.questionMedia.deleteMany({ where: { questionId: { in: ids } } });
            await tx.question.deleteMany({ where: { id: { in: ids } } });
        }
        await tx.quiz.delete({ where: { id: quizId } });
    });
}
