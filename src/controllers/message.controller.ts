import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getAppDatabaseService } from '../services/app-database.service';
import { getDatabaseService } from '../services/database.service';
import { ApiResponse } from '../models/user.model';
import { BadRequestError, NotFoundError } from '../models/error.model';
import { sseService } from '../utils/sse';

const db = getAppDatabaseService();
const userDb = getDatabaseService();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

export class MessageController {
  /** GET /api/messages — Get inbox */
  async getInbox(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const messages = await db.getMessages(userId);
      const response: ApiResponse = {
        success: true,
        data: messages,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/messages — Send a message */
  async send(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError(errors.array()[0].msg);

      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const user = await userDb.getUserById(userId);
      if (!user) throw new NotFoundError('User not found');

      const fromName = (user as any).username || (user as any).name || (user as any).agencyName || (user as any).clubName || user.email;
      const { toUserId, subject, body, parentId } = req.body;

      const message = await db.createMessage(userId, fromName, toUserId, subject, body, parentId);
      const response: ApiResponse = {
        success: true,
        message: 'Message sent successfully',
        data: message,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/messages/:id/reply — Reply to a message */
  async reply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const user = await userDb.getUserById(userId);
      if (!user) throw new NotFoundError('User not found');

      const fromName = (user as any).username || (user as any).name || user.email;
      const { body } = req.body;
      if (!body) throw new BadRequestError('Reply body is required');

      // Get original message to find recipient
      const messages = await db.getMessages(userId);
      const original = messages.find(m => m.id === req.params.id);
      if (!original) throw new NotFoundError('Original message not found');

      const toUserId = original.fromUserId;
      if (!toUserId) throw new BadRequestError('Cannot reply to this message');

      const message = await db.createMessage(userId, fromName, toUserId, `Re: ${original.subject}`, body, req.params.id);
      const response: ApiResponse = {
        success: true,
        message: 'Reply sent successfully',
        data: message,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/messages/:id/read — Mark message as read */
  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      await db.markMessageRead(req.params.id, userId);
      const response: ApiResponse = {
        success: true,
        message: 'Marked as read',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/messages/:id — Delete message */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const deleted = await db.deleteMessage(req.params.id, userId);
      if (!deleted) throw new NotFoundError('Message not found');

      const response: ApiResponse = {
        success: true,
        message: 'Message deleted successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  // ─── Conversation endpoints ────────────────────────────────

  /** GET /api/messages/conversations — List conversations for the current user */
  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const conversations = await db.getConversations(userId);
      res.status(200).json({ success: true, data: conversations });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/messages/conversations
   * Body: { escortUserId, advertisementId? }
   * Get or create a conversation between the current user and an escort.
   */
  async getOrCreateConversation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const { escortUserId, advertisementId } = req.body;
      if (!escortUserId) throw new BadRequestError('escortUserId is required');

      const conversation = await db.getOrCreateConversation(userId, escortUserId, advertisementId);
      res.status(200).json({ success: true, data: conversation });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/messages/conversations/:id — Get messages in a conversation */
  async getConversationMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const convo = await db.getConversationById(req.params.id, userId);
      if (!convo) throw new NotFoundError('Conversation not found');

      const messages = await db.getConversationMessages(req.params.id, userId);
      res.status(200).json({ success: true, data: messages });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/messages/conversations/:id/messages
   * Body: { body }
   * Send a message inside a conversation.
   */
  async sendConversationMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const { body: messageBody } = req.body;
      if (!messageBody?.trim()) throw new BadRequestError('Message body is required');

      const convo = await db.getConversationById(req.params.id, userId);
      if (!convo) throw new NotFoundError('Conversation not found');

      const user = await userDb.getUserById(userId);
      if (!user) throw new NotFoundError('User not found');

      const fromName = (user as any).username || (user as any).name || (user as any).agencyName || (user as any).clubName || user.email;
      const toUserId = convo.participantAId === userId ? convo.participantBId : convo.participantAId;

      const message = await db.sendConversationMessage(req.params.id, userId, fromName, toUserId, messageBody.trim());

      // Push real-time notification to recipient
      sseService.emit(toUserId, 'new_message', {
        conversationId: req.params.id,
        message,
        fromName,
        fromUserId: userId,
      });

      res.status(201).json({ success: true, data: message });
    } catch (error) {
      next(error);
    }
  }
}
