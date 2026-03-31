import { Router } from 'express';
import { body } from 'express-validator';
import { submitContactForm } from '../controllers/contact.controller';

const router = Router();

const contactValidation = [
  body('email')
    .isEmail()
    .withMessage('A valid email address is required.')
    .normalizeEmail(),
  body('topic')
    .trim()
    .notEmpty()
    .withMessage('Topic is required.')
    .isLength({ max: 200 })
    .withMessage('Topic must be at most 200 characters.'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required.')
    .isLength({ max: 5000 })
    .withMessage('Message must be at most 5000 characters.'),
];

/**
 * @route   POST /api/contact
 * @desc    Submit a contact form (public, no auth required)
 * @access  Public
 */
router.post('/', contactValidation, submitContactForm);

export default router;
