import { Router } from 'express';
import { lookupZipcode } from '../controllers/zipcode.controller';

const router = Router();

/**
 * @route   GET /api/zipcode?code=1234AB&country=nl
 * @desc    Resolve a postal code to a list of city names.
 *          Results are cached in the database to minimise external API usage.
 * @access  Public
 */
router.get('/', lookupZipcode);

export default router;
