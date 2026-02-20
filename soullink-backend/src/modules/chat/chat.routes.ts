import { Router } from 'express';
import { chatController } from './chat.controller.js';
import { protect } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';

const router = Router();

router.use(protect);

router.get('/dm/:friendId', chatController.getConversation);
router.post('/dm/:friendId', chatController.sendMessage);
router.patch('/dm/:friendId/read', chatController.markAsRead);
router.post('/upload', upload.single('file'), chatController.uploadFile);
router.get('/search', chatController.searchMessages);

export default router;
