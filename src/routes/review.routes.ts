import { Router } from 'express';
import { ReviewController } from '../controllers/review.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createReviewValidation } from '../middleware/validation.middleware';

const router = Router();
const controller = new ReviewController();

/**
 * @route   GET /api/reviews
 * @desc    Get reviews received by current user
 * @access  Private
 */
router.get('/', authMiddleware, controller.getMyReviews.bind(controller));

/**
 * @route   GET /api/reviews/advertisement/:id
 * @desc    Get reviews for a specific advertisement
 * @access  Public
 */
router.get('/advertisement/:id', controller.getByAdvertisement.bind(controller));

/**
 * @route   POST /api/reviews
 * @desc    Create a new review
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
  createReviewValidation,
  controller.create.bind(controller)
);

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete a review
 * @access  Private (author only)
 */
router.delete('/:id', authMiddleware, controller.delete.bind(controller));

export default router;
