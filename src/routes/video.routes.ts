import { Router } from 'express';
import { VideoController } from '../controllers/video.controller';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new VideoController();

router.get('/trending', controller.trending.bind(controller));
router.get('/hub', controller.hub.bind(controller));
router.post('/:id/views', optionalAuthMiddleware, controller.recordView.bind(controller));

export default router;
