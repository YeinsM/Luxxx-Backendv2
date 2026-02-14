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
 * @route   DELETE /api/profile/media/photos/:id
 * @desc    Delete a photo
 * @access  Private
 */
router.delete('/photos/:id', authMiddleware, deleteMyPhoto);

/**
 * @route   DELETE /api/profile/media/videos/:id
 * @desc    Delete a video
 * @access  Private
 */
router.delete('/videos/:id', authMiddleware, deleteMyVideo);

export default router;
