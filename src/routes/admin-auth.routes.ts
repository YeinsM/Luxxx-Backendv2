import { Router } from 'express';
import { adminLogin, adminSetPassword } from '../controllers/admin-auth.controller';

const router = Router();

/**
 * Public admin authentication endpoints — NO auth middleware.
 * Mounted at /api/admin-auth in routes/index.ts (before /api/admin).
 */
router.post('/login', adminLogin);
router.post('/set-password', adminSetPassword);

export default router;
