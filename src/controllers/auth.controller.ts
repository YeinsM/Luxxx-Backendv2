import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from '../services/auth.service';
import { ApiResponse } from '../models/user.model';
import { BadRequestError } from '../models/error.model';

const authService = new AuthService();

export class AuthController {
  async registerEscort(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const result = await authService.registerEscort(req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Escort registered successfully',
        data: result,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async registerMember(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const result = await authService.registerMember(req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Member registered successfully',
        data: result,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async registerAgency(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const result = await authService.registerAgency(req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Agency registered successfully',
        data: result,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async registerClub(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const result = await authService.registerClub(req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Club registered successfully',
        data: result,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const result = await authService.login(req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Login successful',
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async getCurrentUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new BadRequestError('User ID not found');
      }

      const user = await authService.getUserById(userId);
      if (!user) {
        throw new BadRequestError('User not found');
      }

      const response: ApiResponse = {
        success: true,
        data: user,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async verifyEmail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { token } = req.query;
      
      if (!token || typeof token !== 'string') {
        throw new BadRequestError('Token de verificación requerido');
      }

      const result = await authService.verifyEmail(token);
      const response: ApiResponse = {
        success: true,
        message: 'Email verificado exitosamente',
        data: result,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async resendVerification(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const result = await authService.resendVerification(req.body);
      const response: ApiResponse = {
        success: true,
        message: result.message,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  async changePassword(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new BadRequestError(errors.array()[0].msg);
      }

      const userId = (req as any).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const { currentPassword, newPassword } = req.body;
      const result = await authService.changePassword(userId, currentPassword, newPassword);

      const response: ApiResponse = {
        success: true,
        message: result.message,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
