import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { ForbiddenError, UnauthorizedError } from '../models/error.model';
import { getDatabaseService } from '../services/database.service';

const db = getDatabaseService();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    // Also accept token from query string (needed for EventSource / SSE)
    const queryToken = req.query.token as string | undefined;

    if (!authHeader && !queryToken) {
      throw new UnauthorizedError('No token provided');
    }

    let token: string;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        throw new UnauthorizedError('Invalid token format');
      }
      token = parts[1];
    } else {
      token = queryToken!;
    }
    const decoded = verifyToken(token);

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    if (decoded.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedError('Session expired, please login again');
    }

    // Attach user info to request
    (req as any).user = decoded;
    next();
  } catch (error) {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const optionalAuthMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string | undefined;

    if (!authHeader && !queryToken) {
      next();
      return;
    }

    let token: string;
    if (authHeader) {
      const parts = authHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        next();
        return;
      }
      token = parts[1];
    } else {
      token = queryToken!;
    }

    const decoded = verifyToken(token);
    const user = await db.getUserById(decoded.userId);

    if (user && user.isActive && decoded.tokenVersion === user.tokenVersion) {
      (req as any).user = decoded;
    }
  } catch {
    // Ignore invalid optional auth and continue as anonymous.
  }

  next();
};

/**
 * Middleware: only users with userType === 'member' may proceed.
 * Must be used AFTER authMiddleware.
 */
export const requireMember = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  if (!user || user.userType !== 'member') {
    return next(new ForbiddenError('Solo los clientes pueden realizar esta acción'));
  }
  next();
};
