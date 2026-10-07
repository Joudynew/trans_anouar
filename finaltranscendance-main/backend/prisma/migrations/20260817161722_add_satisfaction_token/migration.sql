/*
  Warnings:

  - A unique constraint covering the columns `[satisfactionToken]` on the table `Intervention` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[satisfactionToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Intervention" ADD COLUMN     "satisfactionSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "satisfactionToken" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "satisfactionSubmitted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "satisfactionToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_satisfactionToken_key" ON "Intervention"("satisfactionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_satisfactionToken_key" ON "User"("satisfactionToken");
