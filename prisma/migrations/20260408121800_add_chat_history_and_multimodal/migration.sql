-- AlterTable
ALTER TABLE "public"."AIGenerationJob" ADD COLUMN     "imageUrls" TEXT[];

-- AlterTable
ALTER TABLE "public"."Promotion" ALTER COLUMN "bannerColor" SET DEFAULT '#0078D4';

-- CreateTable
CREATE TABLE "public"."AgentChatSession" (
    "id" SERIAL NOT NULL,
    "title" TEXT DEFAULT 'Cuộc hội thoại mới',
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgentChatMessage" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentChatSession_userId_idx" ON "public"."AgentChatSession"("userId");

-- CreateIndex
CREATE INDEX "AgentChatMessage_sessionId_idx" ON "public"."AgentChatMessage"("sessionId");

-- AddForeignKey
ALTER TABLE "public"."AgentChatSession" ADD CONSTRAINT "AgentChatSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgentChatMessage" ADD CONSTRAINT "AgentChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."AgentChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
