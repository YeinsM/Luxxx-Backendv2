import { Request, Response } from 'express';
import { getEmailService } from '../services/email.service';
import { UserType, EscortUser } from '../models/user.model';

/**
 * Test email configuration
 */
export const testEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: 'Email is required in request body' });
      return;
    }

    const emailService = getEmailService();
    
    // Create a test user object
    const testUser: EscortUser = {
      id: 'test-123',
      email: email,
      userType: UserType.ESCORT,
      name: 'Usuario de Prueba',
      phone: '+1234567890',
      city: 'Test City',
      age: 25,
      password: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      emailVerified: false,
      photos: [],
      videos: [],
    };

    console.log(`📧 Attempting to send test email to: ${email}`);
    
    const result = await emailService.sendWelcomeEmail(testUser);

    if (result) {
      res.status(200).json({
        success: true,
        message: `Test email sent successfully to ${email}`,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to send email - check server logs for details',
      });
    }
  } catch (error: any) {
    console.error('❌ Test email error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test email',
    });
  }
};
