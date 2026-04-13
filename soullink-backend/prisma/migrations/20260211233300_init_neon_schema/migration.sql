-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'PENDING_FACE_VERIFY', 'PENDING_SOUL_GAME', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

-- CreateEnum
CREATE TYPE "PrivacyLevel" AS ENUM ('PUBLIC', 'MATCHES_ONLY', 'FRIENDS_ONLY', 'PRIVATE');

-- CreateEnum
CREATE TYPE "OnlineStatus" AS ENUM ('ONLINE', 'AWAY', 'DO_NOT_DISTURB', 'OFFLINE');

-- CreateEnum
CREATE TYPE "VerificationType" AS ENUM ('EMAIL', 'PHONE', 'FACE_INITIAL', 'FACE_PERIODIC');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MatchType" AS ENUM ('ONE_TO_ONE', 'GROUP');

-- CreateEnum
CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'GIF', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "ServerRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED_WARNING', 'RESOLVED_SUSPENSION', 'RESOLVED_BAN', 'DISMISSED', 'APPEALED');

-- CreateEnum
CREATE TYPE "ReportCategory" AS ENUM ('HARASSMENT', 'SPAM', 'FAKE_IDENTITY', 'INAPPROPRIATE_CONTENT', 'HATE_SPEECH', 'UNDERAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ModActionType" AS ENUM ('WARNING', 'MUTE', 'SUSPENSION', 'BAN', 'UNBAN', 'CONTENT_REMOVAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION',
    "onlineStatus" "OnlineStatus" NOT NULL DEFAULT 'OFFLINE',
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "faceVerified" BOOLEAN NOT NULL DEFAULT false,
    "lastFaceVerify" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "privacyProfile" "PrivacyLevel" NOT NULL DEFAULT 'PUBLIC',
    "privacyEmail" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE',
    "privacyPhone" "PrivacyLevel" NOT NULL DEFAULT 'PRIVATE',
    "privacyBio" "PrivacyLevel" NOT NULL DEFAULT 'FRIENDS_ONLY',
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "notificationsOn" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "VerificationType" NOT NULL,
    "code" TEXT,
    "token" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoginHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoginHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SoulGame" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT false,
    "episode" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SoulGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameScene" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sceneOrder" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "bgImageUrl" TEXT,
    "novaComment" TEXT NOT NULL,
    "novaMood" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameScene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameChoice" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "themeColor" TEXT NOT NULL,
    "icon" TEXT,
    "reflectionPrompt" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "openness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "conscientiousness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "extraversion" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agreeableness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "neuroticism" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valueCategory" TEXT,
    "valueWeight" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "GameChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "choiceId" TEXT NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "emotionalNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "openness" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "conscientiousness" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "extraversion" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "agreeableness" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "neuroticism" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "mbtiType" TEXT,
    "values" JSONB NOT NULL DEFAULT '{}',
    "interests" JSONB NOT NULL DEFAULT '[]',
    "insights" JSONB NOT NULL DEFAULT '[]',
    "lastCalculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalityProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "summary" TEXT,
    "lastCheckIn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "emotionDetected" TEXT,
    "isProactive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "type" "MatchType" NOT NULL DEFAULT 'ONE_TO_ONE',
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "compatibilityScore" DOUBLE PRECISION NOT NULL,
    "justification" JSONB NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "identityRevealed" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMatch" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "maxSize" INTEGER NOT NULL DEFAULT 8,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupMatchMember" (
    "id" TEXT NOT NULL,
    "groupMatchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroupMatchMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchConversation" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "MatchMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "callerId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "duration" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Server" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "iconUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Server_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Channel" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ChannelType" NOT NULL DEFAULT 'TEXT',
    "groupName" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Channel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerMember" (
    "id" TEXT NOT NULL,
    "serverId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ServerRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "type" "MessageType" NOT NULL DEFAULT 'TEXT',
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedId" TEXT NOT NULL,
    "category" "ReportCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "assignedModId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModAction" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "targetId" TEXT NOT NULL,
    "modId" TEXT NOT NULL,
    "action" "ModActionType" NOT NULL,
    "reason" TEXT NOT NULL,
    "duration" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appeal" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShameWall" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ShameWall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalUsers" INTEGER NOT NULL DEFAULT 0,
    "activeUsers" INTEGER NOT NULL DEFAULT 0,
    "newUsers" INTEGER NOT NULL DEFAULT 0,
    "totalMatches" INTEGER NOT NULL DEFAULT 0,
    "successfulMatches" INTEGER NOT NULL DEFAULT 0,
    "totalMessages" INTEGER NOT NULL DEFAULT 0,
    "totalReports" INTEGER NOT NULL DEFAULT 0,
    "resolvedReports" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgMatchScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retentionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "premiumConversions" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIModelVersion" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIModelVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_handle_key" ON "User"("handle");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_handle_idx" ON "User"("handle");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "Verification_userId_type_idx" ON "Verification"("userId", "type");

-- CreateIndex
CREATE INDEX "LoginHistory_userId_idx" ON "LoginHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SoulGame_slug_key" ON "SoulGame"("slug");

-- CreateIndex
CREATE INDEX "SoulGame_slug_idx" ON "SoulGame"("slug");

-- CreateIndex
CREATE INDEX "GameScene_gameId_idx" ON "GameScene"("gameId");

-- CreateIndex
CREATE INDEX "GameChoice_sceneId_idx" ON "GameChoice"("sceneId");

-- CreateIndex
CREATE INDEX "GameResponse_userId_gameId_idx" ON "GameResponse"("userId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityProfile_userId_key" ON "PersonalityProfile"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_idx" ON "AIMessage"("conversationId");

-- CreateIndex
CREATE INDEX "Match_senderId_status_idx" ON "Match"("senderId", "status");

-- CreateIndex
CREATE INDEX "Match_receiverId_status_idx" ON "Match"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Match_senderId_receiverId_key" ON "Match"("senderId", "receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "GroupMatchMember_groupMatchId_userId_key" ON "GroupMatchMember"("groupMatchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchConversation_matchId_key" ON "MatchConversation"("matchId");

-- CreateIndex
CREATE INDEX "MatchMessage_conversationId_idx" ON "MatchMessage"("conversationId");

-- CreateIndex
CREATE INDEX "Friendship_senderId_status_idx" ON "Friendship"("senderId", "status");

-- CreateIndex
CREATE INDEX "Friendship_receiverId_status_idx" ON "Friendship"("receiverId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_senderId_receiverId_key" ON "Friendship"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_receiverId_idx" ON "DirectMessage"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "DirectMessage_receiverId_senderId_idx" ON "DirectMessage"("receiverId", "senderId");

-- CreateIndex
CREATE INDEX "CallLog_callerId_idx" ON "CallLog"("callerId");

-- CreateIndex
CREATE INDEX "CallLog_receiverId_idx" ON "CallLog"("receiverId");

-- CreateIndex
CREATE INDEX "Server_isPublic_idx" ON "Server"("isPublic");

-- CreateIndex
CREATE INDEX "Channel_serverId_idx" ON "Channel"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "ServerMember_serverId_userId_key" ON "ServerMember"("serverId", "userId");

-- CreateIndex
CREATE INDEX "Message_channelId_idx" ON "Message"("channelId");

-- CreateIndex
CREATE INDEX "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX "Report_reportedId_idx" ON "Report"("reportedId");

-- CreateIndex
CREATE INDEX "ModAction_targetId_idx" ON "ModAction"("targetId");

-- CreateIndex
CREATE UNIQUE INDEX "Appeal_reportId_key" ON "Appeal"("reportId");

-- CreateIndex
CREATE INDEX "Appeal_status_idx" ON "Appeal"("status");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsSnapshot_date_key" ON "AnalyticsSnapshot"("date");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_date_idx" ON "AnalyticsSnapshot"("date");

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginHistory" ADD CONSTRAINT "LoginHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameScene" ADD CONSTRAINT "GameScene_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SoulGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameChoice" ADD CONSTRAINT "GameChoice_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "GameScene"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResponse" ADD CONSTRAINT "GameResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResponse" ADD CONSTRAINT "GameResponse_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SoulGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResponse" ADD CONSTRAINT "GameResponse_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "GameScene"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResponse" ADD CONSTRAINT "GameResponse_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "GameChoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityProfile" ADD CONSTRAINT "PersonalityProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMatchMember" ADD CONSTRAINT "GroupMatchMember_groupMatchId_fkey" FOREIGN KEY ("groupMatchId") REFERENCES "GroupMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupMatchMember" ADD CONSTRAINT "GroupMatchMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchConversation" ADD CONSTRAINT "MatchConversation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchMessage" ADD CONSTRAINT "MatchMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "MatchConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMember" ADD CONSTRAINT "ServerMember_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMember" ADD CONSTRAINT "ServerMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reportedId_fkey" FOREIGN KEY ("reportedId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModAction" ADD CONSTRAINT "ModAction_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModAction" ADD CONSTRAINT "ModAction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModAction" ADD CONSTRAINT "ModAction_modId_fkey" FOREIGN KEY ("modId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appeal" ADD CONSTRAINT "Appeal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
