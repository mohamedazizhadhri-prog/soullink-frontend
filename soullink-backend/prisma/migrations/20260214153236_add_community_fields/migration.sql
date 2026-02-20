/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `Server` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `inviteCode` to the `Server` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Server" ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "inviteCode" TEXT NOT NULL,
ADD COLUMN     "maxMembers" INTEGER NOT NULL DEFAULT 100;

-- CreateIndex
CREATE UNIQUE INDEX "Server_inviteCode_key" ON "Server"("inviteCode");

-- CreateIndex
CREATE INDEX "Server_inviteCode_idx" ON "Server"("inviteCode");
