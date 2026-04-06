/*
  Warnings:

  - The values [RANGE] on the enum `QuestionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."QuestionType_new" AS ENUM ('BUTTONS', 'CHECKBOXES', 'REORDER', 'TYPEANSWER', 'LOCATION');
ALTER TABLE "public"."Question" ALTER COLUMN "type" TYPE "public"."QuestionType_new" USING ("type"::text::"public"."QuestionType_new");
ALTER TABLE "public"."AIGeneratedQuestion" ALTER COLUMN "questionType" TYPE "public"."QuestionType_new" USING ("questionType"::text::"public"."QuestionType_new");
ALTER TYPE "public"."QuestionType" RENAME TO "QuestionType_old";
ALTER TYPE "public"."QuestionType_new" RENAME TO "QuestionType";
DROP TYPE "public"."QuestionType_old";
COMMIT;

-- CreateTable
CREATE TABLE "public"."Promotion" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "planId" INTEGER NOT NULL,
    "discountedPriceMonthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountedPriceYearly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "bannerColor" TEXT DEFAULT '#f59e0b',
    "badgeText" TEXT DEFAULT 'KHUYẾN MÃI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_isPublished_idx" ON "public"."Promotion"("isPublished");

-- CreateIndex
CREATE INDEX "Promotion_isActive_idx" ON "public"."Promotion"("isActive");

-- CreateIndex
CREATE INDEX "Promotion_planId_idx" ON "public"."Promotion"("planId");

-- AddForeignKey
ALTER TABLE "public"."Promotion" ADD CONSTRAINT "Promotion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
