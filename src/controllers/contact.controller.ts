import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { getEmailService } from '../services/email.service';
import { BadRequestError } from '../models/error.model';

/**
 * POST /api/contact
 * Public endpoint — sends a contact form submission to the admin email.
 */
export const submitContactForm = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new BadRequestError(errors.array().map(e => e.msg).join(', '));
    }

    const { email, topic, message } = req.body;

    const emailService = getEmailService();
    const sent = await emailService.sendContactFormEmail(email, topic, message);

    if (!sent) {
      res.status(500).json({
        success: false,
        error: 'Failed to send contact form email. Please try again later.',
      });
      return;
    }

    res.json({ success: true, message: 'Contact form submitted successfully.' });
  } catch (error) {
    next(error);
  }
};
