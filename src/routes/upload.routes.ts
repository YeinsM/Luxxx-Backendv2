import { Router } from 'express';
import {
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
  getOptimizedUrl,
} from '../controllers/upload.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

/**
 * @route   POST /api/upload/image
 * @desc    Upload a single image (base64)
 * @access  Private (requires authentication)
 * @body    { image: string, folder?: string, tags?: string[] }
 */
router.post('/image', authMiddleware, uploadImage);

/**
 * @route   POST /api/upload/images
 * @desc    Upload multiple images (base64)
 * @access  Private (requires authentication)
 * @body    { images: string[], folder?: string, tags?: string[] }
 */
router.post('/images', authMiddleware, uploadMultipleImages);

/**
 * @route   DELETE /api/upload/image
 * @desc    Delete a single image
 * @access  Private (requires authentication)
 * @body    { publicId: string }
 */
router.delete('/image', authMiddleware, deleteImage);

/**
 * @route   DELETE /api/upload/images
 * @desc    Delete multiple images
 * @access  Private (requires authentication)
 * @body    { publicIds: string[] }
 */
router.delete('/images', authMiddleware, deleteMultipleImages);

/**
 * @route   GET /api/upload/optimized-url
 * @desc    Get optimized URL for an image
 * @access  Public
 * @query   publicId, width?, height?, crop?, quality?, format?
 */
router.get('/optimized-url', getOptimizedUrl);

export default router;
