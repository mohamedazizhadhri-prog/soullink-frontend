-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replyToId" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replyToId" TEXT;

-- AlterTable
ALTER TABLE "NovaUserMemory" ADD COLUMN     "city" TEXT,
ADD COLUMN     "country" TEXT;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "DirectMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
