import { Request, Response, NextFunction } from 'express';
import { getAppDatabaseService } from '../services/app-database.service';
import { ApiResponse } from '../models/user.model';

const db = getAppDatabaseService();

export class VideoController {
  async trending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sort, page, limit } = req.query;

      const parsedPage = page ? parseInt(page as string, 10) : 1;
      const parsedLimit = limit ? parseInt(limit as string, 10) : 20;
      const result = await db.getTrendingVideos(
        sort as string | undefined,
        parsedPage,
        parsedLimit,
      );

      const response: ApiResponse = {
        success: true,
        data: {
          videos: result.videos,
          total: result.total,
          page: parsedPage,
          limit: parsedLimit,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async hub(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { gender, page, limit } = req.query;

      const data = await db.getPromotionVideoHub(
        gender as string | undefined,
        page ? parseInt(page as string, 10) : 1,
        limit ? parseInt(limit as string, 10) : 8,
      );

      const response: ApiResponse = {
        success: true,
        data,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async recordView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await db.recordPromotionVideoView(req.params.id, (req as any).user?.userId);

      const response: ApiResponse = {
        success: true,
        data: { recorded: true },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
