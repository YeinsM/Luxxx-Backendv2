import { body } from 'express-validator';
import { normalizeAdvertisementGender } from '../utils/gender.utils';
import { normalizePhoneNumber } from '../utils/phone.utils';

const ESCORT_SERVICE_NAMES = new Set(['escortInbound', 'escort']);
const EXCLUSIVE_SERVICE_NAMES = new Set(['eroticMassage', 'bdsm', 'virtualSex', 'redLights']);

function validateExclusiveAdvertisementServices(services: unknown): boolean {
  if (services === undefined || services === null) {
    return true;
  }

  if (!Array.isArray(services)) {
    throw new Error('Services must be an array');
  }

  const selectedServiceNames = new Set(
    services
      .map((service) =>
        typeof service?.serviceName === 'string'
          ? service.serviceName.trim()
          : ''
      )
      .filter(Boolean)
      .filter((serviceName) =>
        ESCORT_SERVICE_NAMES.has(serviceName) || EXCLUSIVE_SERVICE_NAMES.has(serviceName)
      )
  );

  const selectedExclusiveServices = [...selectedServiceNames].filter((serviceName) =>
    EXCLUSIVE_SERVICE_NAMES.has(serviceName)
  );

  if (selectedExclusiveServices.length > 1) {
    throw new Error('Erotic massage, BDSM, Virtual sex and Red lights are mutually exclusive');
  }

  if (
    selectedExclusiveServices.length === 1 &&
    [...selectedServiceNames].some((serviceName) => ESCORT_SERVICE_NAMES.has(serviceName))
  ) {
    throw new Error(
      'Erotic massage, BDSM, Virtual sex and Red lights cannot be combined with Escort or Escort inbound'
    );
  }

  return true;
}

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

export const submitServiceSuggestionValidation = [
  body('message')
    .trim()
    .isLength({ min: 3, max: 1000 })
    .withMessage('Suggestion message must be between 3 and 1000 characters'),
  body('selectedServices')
    .optional()
    .isArray({ max: 100 })
    .withMessage('Selected services must be an array'),
  body('selectedServices.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Each selected service must be a valid string'),
  body('selectedServiceCategories')
    .optional()
    .isArray({ max: 20 })
    .withMessage('Selected service categories must be an array'),
  body('selectedServiceCategories.*')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Each selected service category must be a valid string'),
  body('profileName')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 120 })
    .withMessage('Profile name is too long'),
  body('advertisementTitle')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Advertisement title is too long'),
];

const advertisementOptionalFields = [
  body('category').optional().trim(),
  body('gender')
    .optional()
    .custom((value: string | undefined) => {
      if (!value) return true;
      if (!normalizeAdvertisementGender(value)) {
        throw new Error('Gender must be woman, man, couple or trans');
      }
      return true;
    }),
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
    .isIn(['STANDARD', 'LAUNCH', 'PREMIUM', 'EXCLUSIVE'])
    .withMessage('Plan must be STANDARD, LAUNCH, PREMIUM or EXCLUSIVE'),
  body('selectedDuration')
    .optional()
    .isIn(['DAY', 'WEEK', 'MONTH'])
    .withMessage('Duration must be DAY, WEEK or MONTH'),
  body('services')
    .optional()
    .custom(validateExclusiveAdvertisementServices),
  body()
    .custom((value: { selectedPlan?: string; selectedDuration?: string } | undefined) => {
      const selectedPlan = value?.selectedPlan?.trim().toUpperCase();
      const selectedDuration = value?.selectedDuration?.trim().toUpperCase();

      if (selectedPlan && !['STANDARD', 'LAUNCH'].includes(selectedPlan) && !selectedDuration) {
        throw new Error('Duration is required for paid plans');
      }

      return true;
    }),
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

export const sendPhoneVerificationCodeValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .custom((value: string) => {
      normalizePhoneNumber(value);
      return true;
    }),
];

export const checkPhoneVerificationCodeValidation = [
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .custom((value: string) => {
      normalizePhoneNumber(value);
      return true;
    }),
  body('code')
    .trim()
    .matches(/^\d{6}$/)
    .withMessage('Verification code must be 6 digits'),
];

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
