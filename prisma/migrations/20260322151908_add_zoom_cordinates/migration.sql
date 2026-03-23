-- CreateEnum
CREATE TYPE "public"."ReportType" AS ENUM ('QUIZ', 'USER', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ReportStatus" AS ENUM ('PENDING', 'RESOLVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "public"."AIGenerationJob" ADD COLUMN     "totalTokens" INTEGER;

-- AlterTable
ALTER TABLE "public"."QuestionMedia" ADD COLUMN     "zoomX" DOUBLE PRECISION DEFAULT 0.5,
ADD COLUMN     "zoomY" DOUBLE PRECISION DEFAULT 0.5;

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "public"."AIModelConfig" (
    "id" SERIAL NOT NULL,
    "featureName" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIModelConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SystemReport" (
    "id" SERIAL NOT NULL,
    "reportType" "public"."ReportType" NOT NULL,
    "targetId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "public"."ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reporterId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIModelConfig_featureName_key" ON "public"."AIModelConfig"("featureName");

-- CreateIndex
CREATE INDEX "SystemReport_status_idx" ON "public"."SystemReport"("status");

-- AddForeignKey
ALTER TABLE "public"."SystemReport" ADD CONSTRAINT "SystemReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
