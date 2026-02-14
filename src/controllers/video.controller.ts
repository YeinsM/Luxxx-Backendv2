import { Request, Response, NextFunction } from 'express';
import { getAppDatabaseService } from '../services/app-database.service';
import { ApiResponse } from '../models/user.model';

const db = getAppDatabaseService();

export class VideoController {
  /** GET /api/videos/trending — Get trending videos */
  async trending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sort, page, limit } = req.query;

      const result = await db.getTrendingVideos(
        sort as string,
        page ? parseInt(page as string) : 1,
        limit ? parseInt(limit as string) : 20,
      );

      const response: ApiResponse = {
        success: true,
        data: {
          videos: result.videos,
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
}
