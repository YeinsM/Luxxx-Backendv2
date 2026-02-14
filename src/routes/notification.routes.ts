import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new NotificationController();

/**
 * @route   GET /api/notifications
 * @desc    List notifications for current user
 * @access  Private
 */
router.get('/', authMiddleware, controller.list.bind(controller));

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark a notification as read
 * @access  Private
 */
router.patch('/:id/read', authMiddleware, controller.markRead.bind(controller));

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete a notification
 * @access  Private
 */
router.delete('/:id', authMiddleware, controller.delete.bind(controller));

export default router;
