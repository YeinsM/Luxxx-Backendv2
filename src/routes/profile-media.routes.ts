import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getMyPhotos,
  getMyVideos,
  uploadMyPhotos,
  uploadMyVideos,
  deleteMyPhoto,
  deleteMyVideo,
  uploadVerificationPhoto,
  getMyPhotoVerifications,
} from '../controllers/profile-media.controller';
import {
  getMyPromotionVideos,
  getMyPromotionVideoStats,
  uploadMyPromotionVideos,
  updateMyPromotionVideo,
  deleteMyPromotionVideo,
} from '../controllers/promotion-video.controller';

const router = Router();

/**
 * @route   GET /api/profile/media/photos
 * @desc    Get current user's photos
 * @access  Private
 */
router.get('/photos', authMiddleware, getMyPhotos);

/**
 * @route   GET /api/profile/media/videos
 * @desc    Get current user's videos
 * @access  Private
 */
router.get('/videos', authMiddleware, getMyVideos);

/**
 * @route   POST /api/profile/media/photos
 * @desc    Upload photos (base64)
 * @access  Private
 */
router.post('/photos', authMiddleware, uploadMyPhotos);

/**
 * @route   POST /api/profile/media/verification-photos
 * @desc    Upload a verification photo (stored in private folder, never in album)
 * @access  Private
 */
router.post('/verification-photos', authMiddleware, uploadVerificationPhoto);

/**
 * @route   POST /api/profile/media/videos
 * @desc    Upload videos (base64)
 * @access  Private
 */
router.post('/videos', authMiddleware, uploadMyVideos);

/**
 * @route   GET /api/profile/media/promotion-videos
 * @desc    Get current user's promotion videos
 * @access  Private
 */
router.get('/promotion-videos', authMiddleware, getMyPromotionVideos);

/**
 * @route   GET /api/profile/media/promotion-videos/stats
 * @desc    Get current user's promotion video stats
 * @access  Private
 */
router.get('/promotion-videos/stats', authMiddleware, getMyPromotionVideoStats);

/**
 * @route   POST /api/profile/media/promotion-videos
 * @desc    Upload promotion videos (base64)
 * @access  Private
 */
router.post('/promotion-videos', authMiddleware, uploadMyPromotionVideos);

/**
 * @route   PATCH /api/profile/media/promotion-videos/:id
 * @desc    Update a promotion video
 * @access  Private
 */
router.patch('/promotion-videos/:id', authMiddleware, updateMyPromotionVideo);

/**
 * @route   DELETE /api/profile/media/photos
 * @desc    Delete a photo (body: { publicId })
 * @access  Private
 */
router.delete('/photos', authMiddleware, deleteMyPhoto);

/**
 * @route   DELETE /api/profile/media/videos
 * @desc    Delete a video (body: { publicId })
 * @access  Private
 */
router.delete('/videos', authMiddleware, deleteMyVideo);

/**
 * @route   DELETE /api/profile/media/promotion-videos/:id
 * @desc    Delete a promotion video
 * @access  Private
 */
router.delete('/promotion-videos/:id', authMiddleware, deleteMyPromotionVideo);

/**
 * @route   GET /api/profile/media/photo-verifications
 * @desc    Get current user's photo verification statuses
 * @access  Private
 */
router.get('/photo-verifications', authMiddleware, getMyPhotoVerifications);

export default router;
