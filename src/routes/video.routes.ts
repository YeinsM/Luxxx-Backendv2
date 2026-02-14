import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';

const router = Router();
const controller = new VideoController();

/**
 * @route   GET /api/videos/trending
 * @desc    Get trending/recent videos
 * @access  Public
 */
router.get('/trending', controller.trending.bind(controller));

export default router;
