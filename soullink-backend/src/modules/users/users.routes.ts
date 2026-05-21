import { Router } from 'express';
import { UsersController } from './users.controller.js';
import { validate } from '../../middleware/validate.js';
import { updateProfileSchema, updatePrivacySchema } from './users.schema.js';
import { protect } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { AppError } from '../../middleware/errorHandler.js';

const router = Router();
const controller = new UsersController();

router.get('/me', protect, controller.getMe);
router.get('/me/suspension', protect, controller.getMySuspension);
router.patch('/me', protect, validate(updateProfileSchema), controller.updateMe);
router.post('/me/avatar', protect, upload.single('avatar'), controller.updateAvatar);
router.post('/me/banner', protect, upload.single('banner'), controller.updateBanner);
router.patch('/me/privacy', protect, validate(updatePrivacySchema), controller.updateMe);

router.get('/search', controller.search);
router.get('/:handle', protect, controller.getProfile);

export default router;
