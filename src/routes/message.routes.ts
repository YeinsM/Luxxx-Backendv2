import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { createMessageValidation } from '../middleware/validation.middleware';

const router = Router();
const controller = new MessageController();

/**
 * @route   GET /api/messages
 * @desc    Get inbox messages for current user
 * @access  Private
 */
router.get('/', authMiddleware, controller.getInbox.bind(controller));

/**
 * @route   POST /api/messages
 * @desc    Send a new message
 * @access  Private
 */
router.post(
  '/',
  authMiddleware,
  createMessageValidation,
  controller.send.bind(controller)
);

/**
 * @route   POST /api/messages/:id/reply
 * @desc    Reply to a message
 * @access  Private
 */
router.post('/:id/reply', authMiddleware, controller.reply.bind(controller));

/**
 * @route   PATCH /api/messages/:id/read
 * @desc    Mark a message as read
 * @access  Private
 */
router.patch('/:id/read', authMiddleware, controller.markRead.bind(controller));

/**
 * @route   DELETE /api/messages/:id
 * @desc    Delete a message
 * @access  Private
 */
router.delete('/:id', authMiddleware, controller.delete.bind(controller));

export default router;
