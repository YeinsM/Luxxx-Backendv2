import { Router } from 'express';
import { ViewerMetricsController } from '../controllers/viewer-metrics.controller';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const controller = new ViewerMetricsController();

router.get('/', controller.getSummary.bind(controller));
router.post(
  '/presence/heartbeat',
  optionalAuthMiddleware,
  controller.heartbeat.bind(controller),
);

export default router;