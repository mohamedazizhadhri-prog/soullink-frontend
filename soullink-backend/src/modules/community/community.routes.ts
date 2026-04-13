import { Router } from 'express';
import { CommunityController } from './community.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createCommunitySchema, updateCommunitySchema, joinCommunitySchema, sendMessageSchema } from './community.schema.js';
import { upload } from '../../middleware/upload.js';

const router = Router();
const controller = new CommunityController();

router.use(protect);

// Community CRUD
router.get('/', controller.listMyCommunities);
router.get('/discover', controller.listPublicCommunities);
router.post('/', upload.fields([{ name: 'icon', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), validate(createCommunitySchema), controller.createCommunity);
router.post('/join', validate(joinCommunitySchema), controller.join);

router.get('/:id', controller.getCommunity);
router.patch('/:id', upload.fields([{ name: 'icon', maxCount: 1 }, { name: 'banner', maxCount: 1 }]), validate(updateCommunitySchema), controller.updateCommunity);
router.delete('/:id', controller.deleteCommunity);
router.post('/:id/join', controller.joinPublic);
router.delete('/:id/leave', controller.leave);

// Member management
router.get('/:id/members', controller.getMembers);
router.patch('/:id/members/:memberId/role', controller.updateMemberRole);
router.delete('/:id/members/:memberId', controller.kickMember);

// Channel management
router.post('/:id/channels', controller.createChannel);
router.patch('/:id/channels/:channelId', controller.updateChannel);
router.delete('/:id/channels/:channelId', controller.deleteChannel);

// Channel messages
router.get('/:id/channels/:channelId/messages', controller.getMessages);
router.post('/:id/channels/:channelId/messages', upload.single('file'), validate(sendMessageSchema), controller.sendMessage);
router.patch('/:id/channels/:channelId/messages/:messageId/pin', controller.toggleMessagePin);
router.get('/:id/channels/:channelId/pinned', controller.getPinnedMessages);

// Invite suggestions
router.get('/:id/invite-suggestions', controller.getInviteSuggestions);

// Moderation
router.post('/:id/members/:memberId/ban', controller.banMember);
router.delete('/:id/members/:userId/ban', controller.unbanMember);
router.post('/:id/members/:memberId/timeout', controller.timeoutMember);
router.delete('/:id/members/:userId/timeout', controller.removeTimeout);
router.patch('/:id/members/:memberId/nickname', controller.setNickname);
router.get('/:id/bans', controller.getBannedMembers);
router.get('/:id/mute-status', controller.getMuteStatus);
router.get('/:id/audit-logs', controller.getAuditLogs);
router.patch('/:id/channels/:channelId/permissions', controller.updateChannelPermissions);

// Settings
router.post('/:id/invite/regenerate', controller.regenerateInviteCode);

export default router;
