-- AlterTable
ALTER TABLE "ServerMember" ADD COLUMN     "nickname" TEXT;

-- CreateTable
CREATE TABLE "ServerBan" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "bannedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerBan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerMute" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "mutedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerMute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServerBan_serverId_idx" ON "ServerBan"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerBan_serverId_userId_key" ON "ServerBan"("serverId", "userId");

-- CreateIndex
CREATE INDEX "ServerMute_serverId_idx" ON "ServerMute"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerMute_serverId_userId_key" ON "ServerMute"("serverId", "userId");

-- AddForeignKey
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerBan" ADD CONSTRAINT "ServerBan_bannedById_fkey" FOREIGN KEY ("bannedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMute" ADD CONSTRAINT "ServerMute_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMute" ADD CONSTRAINT "ServerMute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMute" ADD CONSTRAINT "ServerMute_mutedById_fkey" FOREIGN KEY ("mutedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
