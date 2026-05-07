-- AlterTable
ALTER TABLE "public"."Quiz" ADD COLUMN     "lockExpiresAt" TIMESTAMP(3),
ADD COLUMN     "lockedAt" TIMESTAMP(3),
ADD COLUMN     "lockedById" INTEGER;

-- CreateIndex
CREATE INDEX "Quiz_lockedById_idx" ON "public"."Quiz"("lockedById");

-- AddForeignKey
ALTER TABLE "public"."Quiz" ADD CONSTRAINT "Quiz_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
