import { Router } from 'express';
import { MessageController } from '../controllers/message.controller';
import { authMiddleware, requireMember } from '../middleware/auth.middleware';
import { createMessageValidation } from '../middleware/validation.middleware';

const router = Router();
const controller = new MessageController();

// ─── Legacy inbox routes ──────────────────────────────────────

/**
 * @route   GET /api/messages
 * @desc    Get inbox messages for current user
 * @access  Private
 */
router.get('/', authMiddleware, controller.getInbox.bind(controller));

/**
 * @route   POST /api/messages
 * @desc    Send a new message (member only)
 * @access  Private — member
 */
router.post(
  '/',
  authMiddleware,
  requireMember,
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

// ─── Conversation routes ──────────────────────────────────────

/**
 * @route   GET /api/messages/conversations
 * @desc    List all conversations for the current user
 * @access  Private
 */
router.get('/conversations', authMiddleware, controller.getConversations.bind(controller));

/**
 * @route   POST /api/messages/conversations
 * @desc    Get or create a 1-to-1 conversation (member initiates)
 * @access  Private — member
 */
router.post('/conversations', authMiddleware, requireMember, controller.getOrCreateConversation.bind(controller));

/**
 * @route   GET /api/messages/conversations/:id
 * @desc    Get messages inside a conversation
 * @access  Private
 */
router.get('/conversations/:id', authMiddleware, controller.getConversationMessages.bind(controller));

/**
 * @route   POST /api/messages/conversations/:id/messages
 * @desc    Send a message inside a conversation
 * @access  Private
 */
router.post('/conversations/:id/messages', authMiddleware, controller.sendConversationMessage.bind(controller));

export default router;
