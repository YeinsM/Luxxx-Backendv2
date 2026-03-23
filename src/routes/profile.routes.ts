import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';

const router = Router();
const controller = new ProfileController();

/**
 * @route   GET /api/profiles
 * @desc    Search/list profiles with filters
 * @access  Public
 */
router.get('/', controller.search.bind(controller));

/**
 * @route   GET /api/profiles/stats
 * @desc    Get platform-wide profile statistics
 * @access  Public
 */
router.get('/stats', controller.stats.bind(controller));

/**
 * @route   GET /api/profiles/cities
 * @desc    Get distinct city names from active profiles
 * @access  Public
 */
router.get('/cities', controller.cities.bind(controller));

/**
 * @route   GET /api/profiles/:id
 * @desc    Get a single profile by advertisement ID
 * @access  Public
 */
router.get('/:id', controller.getById.bind(controller));

export default router;
