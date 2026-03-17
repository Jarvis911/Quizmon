/*
  Warnings:

  - A unique constraint covering the columns `[pin]` on the table `Match` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."Match" ADD COLUMN     "pin" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Match_pin_key" ON "public"."Match"("pin");
