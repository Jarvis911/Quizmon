-- CreateEnum
CREATE TYPE "public"."MemberStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."ClassroomMember" ADD COLUMN     "status" "public"."MemberStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "public"."ExpectedStudent" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "studentCode" TEXT,
    "email" TEXT,
    "classroomId" INTEGER NOT NULL,
    "matchedUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpectedStudent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExpectedStudent_classroomId_idx" ON "public"."ExpectedStudent"("classroomId");

-- AddForeignKey
ALTER TABLE "public"."ExpectedStudent" ADD CONSTRAINT "ExpectedStudent_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "public"."Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExpectedStudent" ADD CONSTRAINT "ExpectedStudent_matchedUserId_fkey" FOREIGN KEY ("matchedUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
