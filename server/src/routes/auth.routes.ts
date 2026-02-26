import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { loginLimiter, passwordResetLimiter } from '../middleware/rate-limit.middleware';
import { validate, LoginSchema, ChangePasswordSchema, ForgotPasswordSchema, ResetPasswordSchema } from '../middleware/validate.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

router.post('/login',          loginLimiter,         validate(LoginSchema),          authController.login);
router.post('/forgot-password', passwordResetLimiter, validate(ForgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password',  passwordResetLimiter, validate(ResetPasswordSchema),  authController.resetPassword);

router.get('/me',                authenticate,                                         authController.getMe);
router.post('/change-password',  authenticate,         validate(ChangePasswordSchema), authController.changePassword);

export default router;
