-- AlterTable
ALTER TABLE "public"."AIGenerationJob" ADD COLUMN     "suggestedCategoryId" INTEGER,
ADD COLUMN     "suggestedDescription" TEXT,
ADD COLUMN     "suggestedTitle" TEXT;
