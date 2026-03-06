import { Request, Response, NextFunction } from 'express';
import { getAppDatabaseService } from '../services/app-database.service';

const db = getAppDatabaseService();

/**
 * GET /api/promotion-plans
 * Public — returns all active plans so the frontend can render them dynamically.
 */
export async function getPlans(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const plans = await db.getPromotionPlans();
    res.json({ data: plans });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/promotion-plans/:id
 * Admin only — update pricing or features for a plan.
 */
export async function updatePlan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { pricePerDay, pricePerWeek, pricePerMonth, features, isActive } = req.body;

    const plan = await db.updatePromotionPlan(id, {
      pricePerDay: pricePerDay !== undefined ? Number(pricePerDay) : undefined,
      pricePerWeek: pricePerWeek !== undefined ? Number(pricePerWeek) : undefined,
      pricePerMonth: pricePerMonth !== undefined ? Number(pricePerMonth) : undefined,
      features: features ?? undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
    });

    res.json({ data: plan });
  } catch (err) {
    next(err);
  }
}
