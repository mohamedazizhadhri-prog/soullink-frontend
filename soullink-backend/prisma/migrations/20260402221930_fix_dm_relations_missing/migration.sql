/*
  Warnings:

  - You are about to drop the column `ipAddress` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `resource` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `AuditLog` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `actorId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serverId` to the `AuditLog` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropIndex
DROP INDEX "AuditLog_action_idx";

-- DropIndex
DROP INDEX "AuditLog_userId_idx";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "ipAddress",
DROP COLUMN "metadata",
DROP COLUMN "resource",
DROP COLUMN "resourceId",
DROP COLUMN "userId",
ADD COLUMN     "actorId" TEXT NOT NULL,
ADD COLUMN     "details" JSONB DEFAULT '{}',
ADD COLUMN     "serverId" TEXT NOT NULL,
ADD COLUMN     "targetId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_serverId_idx" ON "AuditLog"("serverId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
