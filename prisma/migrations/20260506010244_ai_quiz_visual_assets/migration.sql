-- AlterTable
ALTER TABLE "public"."AIGeneratedQuestion" ADD COLUMN     "generatedImageUrl" TEXT,
ADD COLUMN     "imageEffect" "public"."ImageEffect" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "public"."AIGenerationJob" ADD COLUMN     "suggestedCoverImageUrl" TEXT;
