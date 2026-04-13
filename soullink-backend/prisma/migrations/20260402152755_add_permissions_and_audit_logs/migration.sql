-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "isAnnouncement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "minPostRole" "ServerRole" NOT NULL DEFAULT 'MEMBER';
