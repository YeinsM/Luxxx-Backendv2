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
import { testEmail } from '../controllers/test-email.controller';

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

// Test email endpoint
router.post('/test-email', testEmail);

// Health check endpoint
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'API is running',
    timestamp: new Date().toISOString(),
  });
});

export default router;
