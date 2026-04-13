import { Router } from 'express';
import { chatController } from './chat.controller.js';
import { protect } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/:friendId', chatController.getConversation);
router.post('/:friendId', upload.single('file'), chatController.sendMessage);
router.patch('/:friendId/mark-read', chatController.markAsRead);
router.patch('/:friendId/messages/:messageId/pin', chatController.togglePin);
router.get('/:friendId/pinned', chatController.getPinnedMessages);
router.post('/upload', upload.single('file'), chatController.uploadFile);
router.get('/search', chatController.searchMessages);

export default router;
