import { Router } from 'express';
import { adminAuthMiddleware } from '../middleware/admin.middleware';
import {
  listUsers,
  updateUserRole,
  createAdmin,
  listVerifications,
  getVerificationDetail,
  updateVerificationStatus,
  getAdminPromotionPlans,
  updateAdminPromotionPlan,
  getAdminSettings,
  updateAdminSettings,
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require a valid ADMIN JWT (signed with ADMIN_JWT_SECRET)
router.use(adminAuthMiddleware);

// ── Users ──────────────────────────────────────────────────────────────
router.get('/users', listUsers);
router.patch('/users/:id/role', updateUserRole);
router.post('/create-admin', createAdmin);

// ── Verifications ──────────────────────────────────────────────────────
router.get('/verifications', listVerifications);
router.get('/verifications/:adId', getVerificationDetail);
router.patch('/verifications/:adId', updateVerificationStatus);

// ── Promotion plans ────────────────────────────────────────────────────
router.get('/promotion-plans', getAdminPromotionPlans);
router.put('/promotion-plans/:id', updateAdminPromotionPlan);

// ── Settings ───────────────────────────────────────────────────────────
router.get('/settings', getAdminSettings);
router.put('/settings', updateAdminSettings);

export default router;
