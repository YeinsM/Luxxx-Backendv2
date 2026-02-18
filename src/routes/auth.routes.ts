import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import {
  registerEscortValidation,
  registerMemberValidation,
  registerAgencyValidation,
  registerClubValidation,
  loginValidation,
  resendVerificationValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
} from '../middleware/validation.middleware';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const authController = new AuthController();

/**
 * @route   POST /api/auth/register/escort
 * @desc    Register a new escort
 * @access  Public
 */
router.post(
  '/register/escort',
  registerEscortValidation,
  authController.registerEscort.bind(authController)
);

/**
 * @route   POST /api/auth/register/member
 * @desc    Register a new member
 * @access  Public
 */
router.post(
  '/register/member',
  registerMemberValidation,
  authController.registerMember.bind(authController)
);

/**
 * @route   POST /api/auth/register/agency
 * @desc    Register a new agency
 * @access  Public
 */
router.post(
  '/register/agency',
  registerAgencyValidation,
  authController.registerAgency.bind(authController)
);

/**
 * @route   POST /api/auth/register/club
 * @desc    Register a new club
 * @access  Public
 */
router.post(
  '/register/club',
  registerClubValidation,
  authController.registerClub.bind(authController)
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  loginValidation,
  authController.login.bind(authController)
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', authMiddleware, authController.getCurrentUser.bind(authController));

/**
 * @route   POST /api/auth/consent/privacy
 * @desc    Persist privacy consent for current user
 * @access  Private
 */
router.post(
  '/consent/privacy',
  authMiddleware,
  authController.acceptPrivacyConsent.bind(authController)
);

/**
 * @route   DELETE /api/auth/me
 * @desc    Soft-delete current user account
 * @access  Private
 */
router.delete(
  '/me',
  authMiddleware,
  authController.deleteMyAccount.bind(authController)
);

/**
 * @route   GET /api/auth/verify-email
 * @desc    Verify user email with token
 * @access  Public
 */
router.get('/verify-email', authController.verifyEmail.bind(authController));

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email
 * @access  Public
 */
router.post(
  '/resend-verification',
  resendVerificationValidation,
  authController.resendVerification.bind(authController)
);

/**
 * @route   PUT /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.put(
  '/change-password',
  authMiddleware,
  changePasswordValidation,
  authController.changePassword.bind(authController)
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  forgotPasswordValidation,
  authController.forgotPassword.bind(authController)
);

/**
 * @route   GET /api/auth/reset-password/validate?token=...
 * @desc    Validate password reset token
 * @access  Public
 */
router.get(
  '/reset-password/validate',
  authController.validateResetToken.bind(authController)
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using one-time token
 * @access  Public
 */
router.post(
  '/reset-password',
  resetPasswordValidation,
  authController.resetPassword.bind(authController)
);

export default router;
