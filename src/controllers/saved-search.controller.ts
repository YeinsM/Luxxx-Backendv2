import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getAppDatabaseService } from '../services/app-database.service';
import { ApiResponse } from '../models/user.model';
import { BadRequestError, NotFoundError } from '../models/error.model';

const db = getAppDatabaseService();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

export class SavedSearchController {
  /** GET /api/saved-searches — List saved searches */
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const searches = await db.getSavedSearches(userId);
      const response: ApiResponse = {
        success: true,
        data: searches,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/saved-searches — Save a search */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError(errors.array()[0].msg);

      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const { name, queryString, resultsCount } = req.body;
      const search = await db.createSavedSearch(userId, name, queryString, resultsCount);

      const response: ApiResponse = {
        success: true,
        message: 'Search saved successfully',
        data: search,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/saved-searches/:id — Delete saved search */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const deleted = await db.deleteSavedSearch(req.params.id, userId);
      if (!deleted) throw new NotFoundError('Saved search not found');

      const response: ApiResponse = {
        success: true,
        message: 'Saved search deleted successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
