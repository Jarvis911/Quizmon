-- CreateEnum
CREATE TYPE "public"."AIGenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."AIQuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REGENERATING');

-- AlterTable
ALTER TABLE "public"."Match" ADD COLUMN     "backgroundUrl" TEXT,
ADD COLUMN     "musicUrl" TEXT,
ADD COLUMN     "timePerQuestion" INTEGER;

-- CreateTable
CREATE TABLE "public"."MatchParticipant" (
    "id" SERIAL NOT NULL,
    "displayName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "matchId" INTEGER NOT NULL,
    "userId" INTEGER,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MatchAnswer" (
    "id" SERIAL NOT NULL,
    "questionId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "answerData" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "score" INTEGER NOT NULL,
    "timeTaken" INTEGER,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIGenerationJob" (
    "id" SERIAL NOT NULL,
    "instruction" TEXT,
    "pdfUrl" TEXT,
    "targetQuizId" INTEGER,
    "status" "public"."AIGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "questionCount" INTEGER NOT NULL DEFAULT 10,
    "errorMessage" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIGeneratedQuestion" (
    "id" SERIAL NOT NULL,
    "jobId" INTEGER NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "public"."QuestionType" NOT NULL,
    "optionsData" JSONB NOT NULL,
    "status" "public"."AIQuestionStatus" NOT NULL DEFAULT 'PENDING',
    "userFeedback" TEXT,
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "finalQuestionId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIGeneratedQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchParticipant_matchId_idx" ON "public"."MatchParticipant"("matchId");

-- CreateIndex
CREATE INDEX "MatchParticipant_userId_idx" ON "public"."MatchParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchParticipant_matchId_userId_key" ON "public"."MatchParticipant"("matchId", "userId");

-- CreateIndex
CREATE INDEX "MatchAnswer_participantId_idx" ON "public"."MatchAnswer"("participantId");

-- CreateIndex
CREATE INDEX "MatchAnswer_questionId_idx" ON "public"."MatchAnswer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchAnswer_participantId_questionId_key" ON "public"."MatchAnswer"("participantId", "questionId");

-- CreateIndex
CREATE INDEX "AIGenerationJob_userId_idx" ON "public"."AIGenerationJob"("userId");

-- CreateIndex
CREATE INDEX "AIGenerationJob_status_idx" ON "public"."AIGenerationJob"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AIGeneratedQuestion_finalQuestionId_key" ON "public"."AIGeneratedQuestion"("finalQuestionId");

-- CreateIndex
CREATE INDEX "AIGeneratedQuestion_jobId_idx" ON "public"."AIGeneratedQuestion"("jobId");

-- CreateIndex
CREATE INDEX "AIGeneratedQuestion_status_idx" ON "public"."AIGeneratedQuestion"("status");

-- AddForeignKey
ALTER TABLE "public"."MatchParticipant" ADD CONSTRAINT "MatchParticipant_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "public"."Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchParticipant" ADD CONSTRAINT "MatchParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchAnswer" ADD CONSTRAINT "MatchAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MatchAnswer" ADD CONSTRAINT "MatchAnswer_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "public"."MatchParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIGenerationJob" ADD CONSTRAINT "AIGenerationJob_targetQuizId_fkey" FOREIGN KEY ("targetQuizId") REFERENCES "public"."Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIGenerationJob" ADD CONSTRAINT "AIGenerationJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIGeneratedQuestion" ADD CONSTRAINT "AIGeneratedQuestion_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "public"."AIGenerationJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIGeneratedQuestion" ADD CONSTRAINT "AIGeneratedQuestion_finalQuestionId_fkey" FOREIGN KEY ("finalQuestionId") REFERENCES "public"."Question"("id") ON DELETE SET NULL ON UPDATE CASCADE;
