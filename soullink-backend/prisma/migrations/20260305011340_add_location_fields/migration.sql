/*
  Warnings:

  - You are about to drop the column `reflectionPrompt` on the `GameChoice` table. All the data in the column will be lost.
  - You are about to drop the column `novaComment` on the `GameScene` table. All the data in the column will be lost.
  - You are about to drop the column `novaMood` on the `GameScene` table. All the data in the column will be lost.
  - You are about to drop the column `mbtiType` on the `PersonalityProfile` table. All the data in the column will be lost.
  - You are about to drop the column `values` on the `PersonalityProfile` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `SoulGame` table. All the data in the column will be lost.
  - You are about to drop the column `privacyBio` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `privacyEmail` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `privacyPhone` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `theme` on the `User` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "VerificationType" ADD VALUE 'PASSWORD_RESET';

-- AlterTable
ALTER TABLE "GameChoice" DROP COLUMN "reflectionPrompt";

-- AlterTable
ALTER TABLE "GameResponse" ALTER COLUMN "responseTimeMs" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "GameScene" DROP COLUMN "novaComment",
DROP COLUMN "novaMood";

-- AlterTable
ALTER TABLE "PersonalityProfile" DROP COLUMN "mbtiType",
DROP COLUMN "values";

-- AlterTable
ALTER TABLE "SoulGame" DROP COLUMN "theme";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "privacyBio",
DROP COLUMN "privacyEmail",
DROP COLUMN "privacyPhone",
DROP COLUMN "theme",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "timezone" TEXT,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

-- CreateTable
CREATE TABLE "SoulGameProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "currentSceneId" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoulGameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBlacklist" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenBlacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovaUserMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "nickname" TEXT,
    "occupation" TEXT,
    "currentMood" TEXT,
    "emotionalTrend" TEXT,
    "topInterests" TEXT[],
    "lifeGoals" TEXT[],
    "currentStruggles" TEXT[],
    "importantPeople" TEXT[],
    "lastTopicDiscussed" TEXT,
    "insideJokes" TEXT[],
    "preferredTone" TEXT,
    "trustLevel" INTEGER NOT NULL DEFAULT 0,
    "friendshipStage" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovaUserMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SoulGameProgress_userId_gameId_key" ON "SoulGameProgress"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBlacklist_token_key" ON "TokenBlacklist"("token");

-- CreateIndex
CREATE INDEX "TokenBlacklist_token_idx" ON "TokenBlacklist"("token");

-- CreateIndex
CREATE UNIQUE INDEX "NovaUserMemory_userId_key" ON "NovaUserMemory"("userId");

-- CreateIndex
CREATE INDEX "NovaUserMemory_userId_idx" ON "NovaUserMemory"("userId");

-- AddForeignKey
ALTER TABLE "SoulGameProgress" ADD CONSTRAINT "SoulGameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoulGameProgress" ADD CONSTRAINT "SoulGameProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SoulGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SoulGameProgress" ADD CONSTRAINT "SoulGameProgress_currentSceneId_fkey" FOREIGN KEY ("currentSceneId") REFERENCES "GameScene"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovaUserMemory" ADD CONSTRAINT "NovaUserMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
