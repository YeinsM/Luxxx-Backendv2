import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../models/error.model';
import { ApiResponse } from '../models/user.model';

export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('Error:', err);

  if (err instanceof ApiError) {
    const response: ApiResponse = {
      success: false,
      error: err.message,
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle other types of errors
  const response: ApiResponse = {
    success: false,
    error: 'Internal server error',
  };
  res.status(500).json(response);
};
