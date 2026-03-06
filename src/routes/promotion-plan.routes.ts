import { Router } from 'express';
import { getPlans, updatePlan } from '../controllers/promotion-plan.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const router = Router();

/**
 * @route   GET /api/promotion-plans
 * @desc    Get all active promotion plans (public)
 * @access  Public
 */
router.get('/', getPlans);

/**
 * @route   PUT /api/promotion-plans/:id
 * @desc    Update a promotion plan's pricing or features
 * @access  Admin only
 */
router.put('/:id', authMiddleware, adminMiddleware, updatePlan);

export default router;
