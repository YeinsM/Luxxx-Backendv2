import { Request, Response, NextFunction } from 'express';
import { getAppDatabaseService } from '../services/app-database.service';
import { ApiResponse } from '../models/user.model';
import { BadRequestError, NotFoundError } from '../models/error.model';

const db = getAppDatabaseService();

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

export class BillingController {
  /** GET /api/billing/balance — Get balance summary */
  async getBalance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const balance = await db.getBalance(userId);
      const response: ApiResponse = {
        success: true,
        data: balance,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/billing/transactions — Get transaction history */
  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const transactions = await db.getTransactions(userId);
      const response: ApiResponse = {
        success: true,
        data: transactions,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/billing/invoices — Get invoices */
  async getInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const invoices = await db.getInvoices(userId);
      const response: ApiResponse = {
        success: true,
        data: invoices,
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/billing/credits/purchase — Simulate credit purchase */
  async purchaseCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const { credits, amount, description } = req.body as { credits: number; amount: number; description?: string };
      if (!credits || !amount || credits <= 0 || amount <= 0) {
        throw new BadRequestError('Invalid credits or amount');
      }

      const desc = description ?? `Compra de ${credits} créditos`;
      await db.addTransaction(userId, 'income', desc, amount);
      const balance = await db.getBalance(userId);

      const response: ApiResponse = { success: true, data: balance };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/billing/boost-price — Get the current boost price */
  async getBoostPrice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const priceStr = await db.getAdminSetting('boost_price_per_day');
      const price = parseFloat(priceStr ?? '4.99');
      const response: ApiResponse = { success: true, data: { price } };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/billing/boost/:adId — Get boost status for an ad */
  async getBoostStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const status = await db.getBoostStatus(req.params.adId, userId);
      const response: ApiResponse = { success: true, data: status };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/billing/boost/:adId — Boost an ad (instant, last-pay wins) */
  async boost(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const priceStr = await db.getAdminSetting('boost_price_per_day');
      const cost = parseFloat(priceStr ?? '4.99');

      const balance = await db.getBalance(userId);
      if (balance.totalBalance < cost) {
        throw new BadRequestError(`Saldo insuficiente. Necesitas €${cost.toFixed(2)} y tienes €${balance.totalBalance.toFixed(2)}`);
      }

      await db.addTransaction(userId, 'expense', 'Impulsar anuncio', cost);
      const { boostedAt } = await db.boostAdvertisement(req.params.adId, userId);
      const newBalance = await db.getBalance(userId);

      const response: ApiResponse = {
        success: true,
        data: { boostedAt, cost, newBalance: newBalance.totalBalance },
      };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/billing/invoices/:id/download — Download invoice */
  async downloadInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const invoice = await db.getInvoiceById(req.params.id, userId);
      if (!invoice) throw new NotFoundError('Invoice not found');

      if (invoice.pdfUrl) {
        res.redirect(invoice.pdfUrl);
      } else {
        // Return invoice data for client-side PDF generation
        const response: ApiResponse = {
          success: true,
          data: invoice,
        };
        res.status(200).json(response);
      }
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/billing/ranking/:adId — Get the model's ranking position in their category */
  async getRanking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as AuthRequest).user?.userId;
      if (!userId) throw new BadRequestError('User ID not found');

      const ranking = await db.getAdvertisementRanking(req.params.adId, userId);
      const response: ApiResponse = { success: true, data: ranking };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
}
