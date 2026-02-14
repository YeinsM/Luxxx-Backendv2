import { Router } from 'express';
import { SavedSearchController } from '../controllers/saved-search.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createSavedSearchValidation } from '../middleware/validation.middleware';

const router = Router();
const controller = new SavedSearchController();

/**
 * @route   GET /api/saved-searches
 * @desc    List saved searches for current user
 * @access  Private
 */
router.get('/', authMiddleware, controller.list.bind(controller));

/**
 * @route   POST /api/saved-searches
 * @desc    Create a new saved search
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
  createSavedSearchValidation,
  controller.create.bind(controller)
);

/**
 * @route   DELETE /api/saved-searches/:id
 * @desc    Delete a saved search
 * @access  Private
 */
router.delete('/:id', authMiddleware, controller.delete.bind(controller));

export default router;
