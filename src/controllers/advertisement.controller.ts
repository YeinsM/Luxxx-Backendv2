import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getAppDatabaseService } from '../services/app-database.service';
import { getEmailService } from '../services/email.service';
import { ApiResponse } from '../models/user.model';
import { BadRequestError, InternalServerError, NotFoundError } from '../models/error.model';

const db = getAppDatabaseService();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

export class AdvertisementController {
  /** POST /api/advertisements — Create new advertisement */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError(errors.array()[0].msg);

      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      // New advertisements are always created offline — verification must be approved first
      req.body = { ...req.body, isOnline: false };

      const ad = await db.createAdvertisement(userId, req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Advertisement created successfully',
        data: ad,
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/advertisements/mine — Get current user's advertisement */
  async getMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const ad = await db.getAdvertisementByUserId(userId);
      const response: ApiResponse = {
        success: true,
        data: ad || null,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/advertisements/:id — Get advertisement by ID */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ad = await db.getPublicAdvertisementById(req.params.id);
      if (!ad) throw new NotFoundError('Advertisement not found');

      const response: ApiResponse = {
        success: true,
        data: ad,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/advertisements/service-suggestion — Send missing-service suggestion to admin alerts */
  async submitServiceSuggestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError(errors.array()[0].msg);

      const userId = (req as AuthRequest).user?.userId;
      const userEmail = (req as AuthRequest).user?.email;
      if (!userId || !userEmail) throw new BadRequestError('User not found');

      const {
        message,
        selectedServices = [],
        selectedServiceCategories = [],
        profileName,
        advertisementTitle,
      } = req.body as {
        message: string;
        selectedServices?: string[];
        selectedServiceCategories?: string[];
        profileName?: string;
        advertisementTitle?: string;
      };

      const alertEmail = await db.getAdminSetting('security_alert_email');
      if (!alertEmail) {
        throw new BadRequestError('No security alert email is configured in administration');
      }

      const existingAd = await db.getAdvertisementByUserId(userId);
      const sent = await getEmailService().sendServiceSuggestionAlert(alertEmail, {
        userId,
        userEmail,
        profileName: profileName?.trim() || existingAd?.name || '',
        advertisementTitle: advertisementTitle?.trim() || existingAd?.title || '',
        selectedServices: Array.isArray(selectedServices) ? selectedServices : [],
        selectedServiceCategories: Array.isArray(selectedServiceCategories)
          ? selectedServiceCategories
          : [],
        message: message.trim(),
        timestamp: new Date().toISOString(),
      });

      if (!sent) {
        throw new InternalServerError('Could not send the service suggestion email');
      }

      const response: ApiResponse<{ sent: boolean }> = {
        success: true,
        message: 'Service suggestion sent successfully',
        data: { sent: true },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** PUT /api/advertisements/:id — Update advertisement */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw new BadRequestError(errors.array()[0].msg);

      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      // Guard: only allow isOnline=true if the advertisement itself is VERIFIED
      const existingAd = await db.getAdvertisementById(req.params.id);
      if (!existingAd || existingAd.verificationStatus !== 'VERIFIED') {
        req.body = { ...req.body, isOnline: false };
      }

      const ad = await db.updateAdvertisement(req.params.id, userId, req.body);
      const response: ApiResponse = {
        success: true,
        message: 'Advertisement updated successfully',
        data: ad,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** DELETE /api/advertisements/:id — Delete advertisement */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const deleted = await db.deleteAdvertisement(req.params.id, userId);
      if (!deleted) throw new NotFoundError('Advertisement not found');

      const response: ApiResponse = {
        success: true,
        message: 'Advertisement deleted successfully',
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/advertisements/:id/verify — Submit verification documents */
  async verify(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const { idType = 'identity_document', idNumber = 'N/A' } = req.body;

      const ad = await db.verifyAdvertisement(req.params.id, userId, idType, idNumber);
      const response: ApiResponse = {
        success: true,
        message: 'Verification submitted successfully',
        data: ad,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/advertisements/:id/promote — Create promotion campaign */
  async promote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const { promotionType, targetAudience, campaignDuration } = req.body;
      if (!promotionType) throw new BadRequestError('Promotion type is required');

      const ad = await db.promoteAdvertisement(
        req.params.id, userId, promotionType, targetAudience, campaignDuration
      );
      const response: ApiResponse = {
        success: true,
        message: 'Promotion created successfully',
        data: ad,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
