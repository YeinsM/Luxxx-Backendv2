import { Router } from 'express';
import authRoutes from './auth.routes';
import uploadRoutes from './upload.routes';
import profileMediaRoutes from './profile-media.routes';
import advertisementRoutes from './advertisement.routes';
import profileRoutes from './profile.routes';
import reviewRoutes from './review.routes';
import messageRoutes from './message.routes';
import notificationRoutes from './notification.routes';
import billingRoutes from './billing.routes';
import savedSearchRoutes from './saved-search.routes';
import videoRoutes from './video.routes';
import zipcodeRoutes from './zipcode.routes';
import promotionPlanRoutes from './promotion-plan.routes';
import adminRoutes from './admin.routes';
import adminAuthRoutes from './admin-auth.routes';
import contactRoutes from './contact.routes';
import { getBranding } from '../controllers/admin.controller';
import { testEmail } from '../controllers/test-email.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { sseService } from '../utils/sse';
import { Request, Response } from 'express';

interface AuthRequest extends Request {
  user?: { userId: string; email: string; userType: string };
}

const router = Router();

// Auth & Upload
router.use('/auth', authRoutes);
router.use('/upload', uploadRoutes);

// Profile & Media
router.use('/profile/media', profileMediaRoutes);
router.use('/profiles', profileRoutes);

// Advertisements
router.use('/advertisements', advertisementRoutes);

// Social / Interaction
router.use('/reviews', reviewRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);

// Billing & Monetization
router.use('/billing', billingRoutes);
router.use('/saved-searches', savedSearchRoutes);
router.use('/videos', videoRoutes);

// Utilities
router.use('/zipcode', zipcodeRoutes);
router.use('/promotion-plans', promotionPlanRoutes);

// Public branding endpoint (no auth required)
router.get('/branding', getBranding);

// Public contact form (no auth required)
router.use('/contact', contactRoutes);

// Admin (public auth endpoints FIRST — before the protected /admin routes)
router.use('/admin-auth', adminAuthRoutes);
router.use('/admin', adminRoutes);

// Test email endpoint
router.post('/test-email', testEmail);

// SSE — real-time push notifications
router.get('/sse/stream', authMiddleware, (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user?.userId;
  if (!userId) { res.status(401).end(); return; }

  sseService.addClient(userId, res);

  req.on('close', () => sseService.removeClient(userId, res));
  req.on('end', () => sseService.removeClient(userId, res));
});

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
