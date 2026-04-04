import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../models/user.model';
import { BadRequestError } from '../models/error.model';
import { getViewerMetricsService } from '../services/viewer-metrics.service';

const viewerMetricsService = getViewerMetricsService();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

export class ViewerMetricsController {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const profileId =
        typeof req.query.profileId === 'string' && req.query.profileId.trim()
          ? req.query.profileId.trim()
          : undefined;

      const summary = await viewerMetricsService.getPublicSummary({ profileId });
      const response: ApiResponse = {
        success: true,
        data: summary,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async heartbeat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sessionId =
        typeof req.body.sessionId === 'string' ? req.body.sessionId.trim() : '';

      if (!/^[a-zA-Z0-9-]{16,128}$/.test(sessionId)) {
        throw new BadRequestError(
          'sessionId must be a valid viewer session identifier',
        );
      }

      const pathname =
        typeof req.body.pathname === 'string' ? req.body.pathname.trim() : undefined;
      const userId = (req as AuthRequest).user?.userId;

      const result = await viewerMetricsService.heartbeatPresence(
        sessionId,
        userId,
        pathname,
      );

      const response: ApiResponse = {
        success: true,
        data: result,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}