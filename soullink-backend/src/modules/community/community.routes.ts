import { Router } from 'express';
import { CommunityController } from './community.controller.js';
import { protect } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createCommunitySchema, joinCommunitySchema, sendMessageSchema } from './community.schema.js';

const router = Router();
const controller = new CommunityController();

router.use(protect);

router.get('/', controller.listMyCommunities);
router.get('/discover', controller.listPublicCommunities);
router.post('/', validate(createCommunitySchema), controller.createCommunity);
router.post('/join', validate(joinCommunitySchema), controller.join);

router.get('/:id', controller.getCommunity);
router.delete('/:id/leave', controller.leave);

router.get('/:id/channels/:channelId/messages', controller.getMessages);
router.post('/:id/channels/:channelId/messages', validate(sendMessageSchema), controller.sendMessage);

export default router;
