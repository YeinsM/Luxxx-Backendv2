import { Router } from 'express';
import { AdvertisementController } from '../controllers/advertisement.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createAdvertisementValidation } from '../middleware/validation.middleware';

const router = Router();
const controller = new AdvertisementController();

/**
 * @route   POST /api/advertisements
 * @desc    Create a new advertisement
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
  createAdvertisementValidation,
  controller.create.bind(controller)
);

/**
 * @route   GET /api/advertisements/mine
 * @desc    Get current user's advertisement
 * @access  Private
 */
router.get('/mine', authMiddleware, controller.getMine.bind(controller));

/**
 * @route   GET /api/advertisements/:id
 * @desc    Get advertisement by ID
 * @access  Public
 */
router.get('/:id', controller.getById.bind(controller));

/**
 * @route   PUT /api/advertisements/:id
 * @desc    Update advertisement
 * @access  Private (owner only)
 */
router.put(
  '/:id',
  authMiddleware,
  createAdvertisementValidation,
  controller.update.bind(controller)
);

/**
 * @route   DELETE /api/advertisements/:id
 * @desc    Delete advertisement
 * @access  Private (owner only)
 */
router.delete('/:id', authMiddleware, controller.delete.bind(controller));

/**
 * @route   POST /api/advertisements/:id/verify
 * @desc    Verify an advertisement (admin)
 * @access  Private
 */
router.post('/:id/verify', authMiddleware, controller.verify.bind(controller));

/**
 * @route   POST /api/advertisements/:id/promote
 * @desc    Promote an advertisement
 * @access  Private (owner)
 */
router.post('/:id/promote', authMiddleware, controller.promote.bind(controller));

export default router;
