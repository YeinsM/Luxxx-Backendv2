import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.utils';
import { UnauthorizedError } from '../models/error.model';
import { getDatabaseService } from '../services/database.service';

const db = getDatabaseService();

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('No token provided');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedError('Invalid token format');
    }

    const token = parts[1];
    const decoded = verifyToken(token);

    const user = await db.getUserById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError('Invalid or expired token');
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
