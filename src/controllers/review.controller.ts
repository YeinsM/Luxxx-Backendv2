import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getAppDatabaseService } from '../services/app-database.service';
import { getDatabaseService } from '../services/database.service';
import { ApiResponse } from '../models/user.model';
import { BadRequestError, NotFoundError } from '../models/error.model';

const db = getAppDatabaseService();
const userDb = getDatabaseService();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

export class ReviewController {
  /** GET /api/reviews — Get reviews for current user's advertisement */
  async getMyReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const reviews = await db.getReviewsByUser(userId);
      const response: ApiResponse = {
        success: true,
        data: reviews,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/reviews/advertisement/:id — Get reviews for a specific advertisement */
  async getByAdvertisement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviews = await db.getReviewsByAdvertisement(req.params.id);
      const response: ApiResponse = {
        success: true,
        data: reviews,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/reviews — Create a review */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError(errors.array()[0].msg);

      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const user = await userDb.getUserById(userId);
      if (!user) throw new NotFoundError('User not found');

      const authorName = (user as any).username || (user as any).name || user.email;
      const { advertisementId, rating, text } = req.body;

      const review = await db.createReview(userId, authorName, advertisementId, rating, text);
      const response: ApiResponse = {
        success: true,
        message: 'Review created successfully',
        data: review,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/reviews/:id — Delete a review */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const deleted = await db.deleteReview(req.params.id, userId);
      if (!deleted) throw new NotFoundError('Review not found or not authorized');

      const response: ApiResponse = {
        success: true,
        message: 'Review deleted successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
