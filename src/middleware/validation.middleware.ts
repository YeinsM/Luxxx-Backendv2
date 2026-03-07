import { body } from 'express-validator';

export const registerEscortValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value: string) => {
      const birth = new Date(value);
      const now = new Date();
      const age = Math.floor((now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 21) throw new Error('Escort profiles require a minimum age of 21');
      if (age > 99) throw new Error('Invalid date of birth');
      return true;
    }),
];

export const registerMemberValidation = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Username must be between 3 and 50 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers and underscores'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('city').trim().notEmpty().withMessage('City is required'),
];

export const registerAgencyValidation = [
  body('agencyName')
    .trim()
    .notEmpty()
    .withMessage('Agency name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Agency name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Valid URL is required'),
];

export const registerClubValidation = [
  body('clubName')
    .trim()
    .notEmpty()
    .withMessage('Club name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Club name must be between 2 and 100 characters'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(/^[\d\s\-\+\(\)]+$/)
    .withMessage('Invalid phone number'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Valid URL is required'),
  body('openingHours').optional().trim(),
];

export const loginValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export const resendVerificationValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
];

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

export const forgotPasswordValidation = [
  body('email').trim().isEmail().withMessage('Valid email is required'),
];

export const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

const advertisementOptionalFields = [
  body('category').optional().trim(),
  body('age').optional().isInt({ min: 21, max: 99 }).withMessage('Escort age must be 21 or older'),
  // Country must be NL
  body('country')
    .optional()
    .custom((value: string | undefined) => {
      if (value && value.toUpperCase() !== 'NL') {
        throw new Error('Only advertisements in the Netherlands (NL) are currently supported');
      }
      return true;
    }),
  // Verification photo URLs (optional, stored on upload)
  body('verificationPhotoPresence').optional().trim().isURL().withMessage('Invalid verification photo URL'),
  body('verificationPhotoBody').optional().trim().isURL().withMessage('Invalid body photo URL'),
  body('verificationPhotoIdentity').optional().trim().isURL().withMessage('Invalid identity photo URL'),
  // Promotion fields
  body('selectedPlan')
    .optional()
    .isIn(['STANDARD', 'PREMIUM', 'EXCLUSIVE'])
    .withMessage('Plan must be STANDARD, PREMIUM or EXCLUSIVE'),
  body('selectedDuration')
    .optional()
    .isIn(['DAY', 'WEEK', 'MONTH'])
    .withMessage('Duration must be DAY, WEEK or MONTH'),
  body('titleEmoji').optional().trim(),
];

export const createAdvertisementValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  ...advertisementOptionalFields,
];

export const updateAdvertisementValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  ...advertisementOptionalFields,
];

// updateAdvertisementValidation shares all optional fields above — defined inline

export const createReviewValidation = [
  body('advertisementId').notEmpty().withMessage('Advertisement ID is required'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('text').optional().trim(),
];

export const createMessageValidation = [
  body('toUserId').notEmpty().withMessage('Recipient is required'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('body').trim().notEmpty().withMessage('Message body is required'),
];

export const createSavedSearchValidation = [
  body('name').trim().notEmpty().withMessage('Search name is required'),
  body('queryString').trim().notEmpty().withMessage('Search query is required'),
];
