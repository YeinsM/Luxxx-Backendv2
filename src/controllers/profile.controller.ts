import { Request, Response, NextFunction } from 'express';
import { getAppDatabaseService } from '../services/app-database.service';
import { ApiResponse } from '../models/user.model';
import { NotFoundError } from '../models/error.model';

const db = getAppDatabaseService();

export class ProfileController {
  /** GET /api/profiles — Search/list profiles */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, city, query, sortBy, page, limit } = req.query;

      const result = await db.searchProfiles({
        category: category as string,
        city: city as string,
        query: query as string,
        sortBy: sortBy as any,
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
      });

      const response: ApiResponse = {
        success: true,
        data: {
          profiles: result.profiles,
          total: result.total,
          page: page ? parseInt(page as string) : 1,
          limit: limit ? parseInt(limit as string) : 20,
        },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/profiles/stats — Get profile statistics */
  async stats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await db.getProfileStats();

      const response: ApiResponse = {
        success: true,
        data: stats,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/profiles/:id — Get profile by ID */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ad = await db.getAdvertisementById(req.params.id);
      if (!ad) throw new NotFoundError('Profile not found');

      // Increment view count (fire & forget)
      db.incrementViewCount(ad.id).catch(() => {});

      const response: ApiResponse = {
        success: true,
        data: ad,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
