import { Request, Response, NextFunction } from 'express';
import { getAppDatabaseService } from '../services/app-database.service';
import { ApiResponse } from '../models/user.model';
import { BadRequestError, NotFoundError } from '../models/error.model';

const db = getAppDatabaseService();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

export class NotificationController {
  /** GET /api/notifications — List notifications */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const notifications = await db.getNotifications(userId);
      const response: ApiResponse = {
        success: true,
        data: notifications,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/notifications/:id/read — Mark read */
  async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      await db.markNotificationRead(req.params.id, userId);
      const response: ApiResponse = {
        success: true,
        message: 'Notification marked as read',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/notifications/:id — Delete */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const deleted = await db.deleteNotification(req.params.id, userId);
      if (!deleted) throw new NotFoundError('Notification not found');

      const response: ApiResponse = {
        success: true,
        message: 'Notification deleted successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
