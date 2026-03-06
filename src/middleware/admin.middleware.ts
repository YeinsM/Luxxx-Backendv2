import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../models/error.model';
import { verifyAdminToken } from '../utils/jwt.utils';
import { getDatabaseService } from '../services/database.service';

const db = getDatabaseService();

/**
 * Full admin middleware: verifies the Bearer token with the ADMIN_JWT_SECRET
 * and confirms role === 'ADMIN'. Replaces authMiddleware + old adminMiddleware
 * on all protected admin routes.
 */
export const adminAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new UnauthorizedError('No token provided'));
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAdminToken(token);

    if (decoded.role !== 'ADMIN') {
      return next(new ForbiddenError('Admin access required'));
    }

    const user = await db.getUserById(decoded.userId);
    if (!user || !user.isActive) {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    if (decoded.tokenVersion !== user.tokenVersion) {
      return next(new UnauthorizedError('Session expired, please login again'));
    }

    (req as any).user = decoded;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

/**
 * @deprecated — use adminAuthMiddleware instead.
 * Kept for backwards compat while legacy admin routes still use authMiddleware + adminMiddleware.
 */
export const adminMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const user = (req as any).user;
  if (!user || user.role !== 'ADMIN') {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
};
