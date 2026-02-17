import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getMyPhotos,
  getMyVideos,
  uploadMyPhotos,
  uploadMyVideos,
  deleteMyPhoto,
  deleteMyVideo,
} from '../controllers/profile-media.controller';

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
 * @route   POST /api/profile/media/videos
 * @desc    Upload videos (base64)
 * @access  Private
 */
router.post('/videos', authMiddleware, uploadMyVideos);

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

export default router;
