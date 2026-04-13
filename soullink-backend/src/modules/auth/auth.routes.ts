import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { protect } from '../../middleware/auth.js';
import { upload } from '../../middleware/upload.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { registerSchema, loginSchema, otpVerifySchema, forgotPasswordSchema, resetPasswordSchema } from './auth.schema.js';

const router = Router();
const controller = new AuthController();

router.post('/register', authRateLimiter, validate(registerSchema), controller.register);
router.post('/login', authRateLimiter, validate(loginSchema), controller.login);
router.post('/login-face', authRateLimiter, controller.loginWithFace);
router.post('/verify-email', validate(otpVerifySchema), controller.verifyEmail);
router.post('/verify-phone', controller.verifyPhone);
router.post('/logout', controller.logout);

// Password Reset
router.post('/forgot-password', authRateLimiter, validate(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authRateLimiter, validate(resetPasswordSchema), controller.resetPassword);

// Facial Recognition (requires auth snapshot)
router.post('/face-enroll', protect, upload.single('face'), controller.enrollFace);

export default router;
