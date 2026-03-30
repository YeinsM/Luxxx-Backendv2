// ============================================================
// Advertisement Models & DTOs
// ============================================================

export interface Advertisement {
  id: string;
  userId: string;
  
  // Basic info
  name: string;
  title?: string;
  description?: string;
  category: string;
  
  // Status
  isOnline: boolean;
  currentlyOnline?: boolean;
  isVerified: boolean;
  isPremium: boolean;
  status: 'draft' | 'active' | 'paused' | 'suspended';
  
  // Location
  country?: string;
  city?: string;
  cityPart?: string;
  zipCode?: string;
  
  // Personal data
  gender?: string;
  genderIdentity?: string;
  orientation?: string;
  age?: number;
  ethnicity?: string;
  nationality?: string;
  languages?: string[];
  
  // Physical attributes
  bodyType?: string;
  height?: string;
  weight?: string;
  eyes?: string;
  hairColor?: string;
  hairLength?: string;
  pubicHair?: string;
  bustSize?: string;
  bustType?: string;
  penisLength?: string;
  circumcised?: string;
  
  // Lifestyle
  smoker?: string;
  tattoo?: string;
  piercing?: string;
  
  // Work preferences
  travel?: string;
  availableFor?: string;
  meetingWith?: string;
  
  // Working hours
  workingHours?: Record<string, string>;
  
  // Contact
  phone?: string;
  phoneVerified?: boolean;
  contactByPhone?: boolean;
  contactByWhatsApp?: boolean;
  contactBySignal?: boolean;
  contactByTelegram?: boolean;
  contactBySMS?: boolean;
  contactByKinky?: boolean;
  kinkyEmailFrequency?: string;
  websiteUrl?: string;
  
  // Promo
  promotedAt?: Date;
  lastSeenOnlineAt?: Date;
  presenceExpiresAt?: Date;
  promoSticker?: string;
  budget?: number;
  
  // Verification
  idType?: string;
  idNumber?: string;
  verificationStatus: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
  verificationPhotoPresence?: string;
  verificationPhotoBody?: string;
  verificationPhotoIdentity?: string;

  // Emoji title feature
  titleEmoji?: string;
  
  // Promotion campaign
  promotionType?: string;
  targetAudience?: string;
  campaignDuration?: string;
  selectedPlan?: string;       // STANDARD | LAUNCH | PREMIUM | EXCLUSIVE
  selectedDuration?: string;   // DAY | WEEK | MONTH
  selectedAddons?: string[];   // e.g. ['promo_sticker', 'emoji_title']
  planExpiresAt?: Date;
  
  // Stats
  viewCount: number;
  rating: number;
  reviewCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Selected photos (URLs of photos the escort chose to show on their ad)
  selectedPhotoIds?: string[];

  // Selected videos (URLs of videos the escort chose to show on their ad)
  selectedVideoIds?: string[];

  // Boost / plan positioning
  planPriority?: number;       // 0=none, 1=STANDARD, 2=PREMIUM, 3=EXCLUSIVE
  boostedUntil?: Date;         // Non-null and future = active boost

  // Joined data (not stored in advertisements table)
  services?: AdvertisementService[];
  rates?: AdvertisementRate[];
  photos?: UserMedia[];
  videos?: UserMedia[];
}

export interface AdvertisementService {
  id: string;
  advertisementId: string;
  serviceName: string;
  price?: number;
  notes?: string;
  createdAt: Date;
}

export interface AdvertisementRate {
  id: string;
  advertisementId: string;
  timeLabel: string;
  incallPrice?: string;
  outcallPrice?: string;
  createdAt: Date;
}

export interface UserMedia {
  id: string;
  userId: string;
  url: string;
  publicId: string;
  resourceType: 'image' | 'video';
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

export interface PromotionVideo {
  id: string;
  userId: string;
  title: string;
  description?: string;
  url: string;
  publicId: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  duration?: number;
  isPublic: boolean;
  viewCount: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromotionVideoView {
  id: string;
  promotionVideoId: string;
  viewerUserId?: string;
  isAnonymous: boolean;
  createdAt: Date;
}

export interface Review {
  id: string;
  advertisementId: string;
  authorId?: string;
  authorName: string;
  rating: number;
  text?: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Message {
  id: string;
  fromUserId?: string;
  toUserId: string;
  fromName: string;
  subject: string;
  body: string;
  isRead: boolean;
  parentId?: string;
  conversationId?: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participantAId: string;
  participantBId: string;
  advertisementId?: string;
  lastMessageAt: Date;
  createdAt: Date;
  /** Populated on query — last message body */
  lastMessageBody?: string;
  /** Populated on query — count of unread messages for the requesting user */
  unreadCount?: number;
  /** Populated on query — other participant's display name */
  otherParticipantName?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'booking' | 'review' | 'message' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  relatedId?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  balanceAfter?: number;
  createdAt: Date;
}

export interface Invoice {
  id: string;
  userId: string;
  invoiceNumber: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  description?: string;
  dueDate?: Date;
  paidAt?: Date;
  pdfUrl?: string;
  createdAt: Date;
}

export interface PhotoVerification {
  id: string;
  advertisementId: string;
  userId: string;
  photoUrl: string;
  publicId: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  adminComment?: string;
  createdAt: Date;
  reviewedAt?: Date;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  queryString: string;
  resultsCount: number;
  createdAt: Date;
}

// ============================================================
// DTOs (Data Transfer Objects)
// ============================================================

export interface CreateAdvertisementDto {
  name: string;
  title?: string;
  description?: string;
  category?: string;
  isOnline?: boolean;
  country?: string;
  city?: string;
  cityPart?: string;
  zipCode?: string;
  gender?: string;
  genderIdentity?: string;
  orientation?: string;
  age?: number;
  ethnicity?: string;
  nationality?: string;
  languages?: string[];
  bodyType?: string;
  height?: string;
  weight?: string;
  eyes?: string;
  hairColor?: string;
  hairLength?: string;
  pubicHair?: string;
  bustSize?: string;
  bustType?: string;
  penisLength?: string;
  circumcised?: string;
  smoker?: string;
  tattoo?: string;
  piercing?: string;
  travel?: string;
  availableFor?: string;
  meetingWith?: string;
  workingHours?: Record<string, string>;
  phone?: string;
  contactByPhone?: boolean;
  contactByWhatsApp?: boolean;
  contactBySignal?: boolean;
  contactByTelegram?: boolean;
  contactBySMS?: boolean;
  contactByKinky?: boolean;
  kinkyEmailFrequency?: string;
  websiteUrl?: string;
  promoSticker?: string;
  budget?: number;
  // Step 2 - Verification
  idType?: string;
  idNumber?: string;
  verificationPhotoPresence?: string;
  verificationPhotoBody?: string;
  verificationPhotoIdentity?: string;
  // Step 3 - Promotion
  promotionType?: string;
  targetAudience?: string;
  campaignDuration?: string;
  selectedPlan?: string;      // STANDARD | LAUNCH | PREMIUM | EXCLUSIVE
  selectedDuration?: string;  // DAY | WEEK | MONTH
  selectedAddons?: string[];  // e.g. ['promo_sticker', 'emoji_title']
  planExpiresAt?: Date;
  // Emoji title feature
  titleEmoji?: string;
  // Selected photos
  selectedPhotoIds?: string[];
  // Selected videos
  selectedVideoIds?: string[];
  // Related data
  services?: Array<{ serviceName: string; price?: number; notes?: string }>;
  rates?: Array<{ timeLabel: string; incallPrice?: string; outcallPrice?: string }>;
}

export interface CreateReviewDto {
  advertisementId: string;
  rating: number;
  text?: string;
}

export interface CreateMessageDto {
  toUserId: string;
  subject: string;
  body: string;
  parentId?: string;
}

export interface CreateSavedSearchDto {
  name: string;
  queryString: string;
  resultsCount?: number;
}

// ============================================================
// Promotion Plans (dynamic, admin-managed)
// ============================================================

export type PlanName = 'STANDARD' | 'LAUNCH' | 'PREMIUM' | 'EXCLUSIVE';
export type PromotionPlanAvailabilityStatus = 'AVAILABLE' | 'COMING_SOON' | 'HIDDEN';
export type DurationType = 'DAY' | 'WEEK' | 'MONTH';

export interface PromotionPlanFeatures {
  direct_contact?: boolean;
  unlimited_videos?: boolean;
  max_photos?: number;
  website_link?: boolean;
  rotating_banner?: boolean;
  promo_tag?: boolean;
  emoji_in_title?: boolean;
  promo_sticker_price_per_day?: number;
  boost_price_per_day?: number;
  emoji_price_per_day?: number;
  position?: string;
  [key: string]: unknown;
}

export interface PromotionPlan {
  id: string;
  name: PlanName;
  displayName: string;
  pricePerDay: number;
  pricePerWeek: number;
  pricePerMonth: number;
  features: PromotionPlanFeatures;
  isActive: boolean;
  availabilityStatus: PromotionPlanAvailabilityStatus;
  expiresAt?: Date | null;
  updatedAt: Date;
}

export interface AdvertisementPromotion {
  id: string;
  advertisementId: string;
  planId: string;
  durationType: DurationType;
  price: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertAdvertisementPromotionDto {
  advertisementId: string;
  planId: string;
  durationType: DurationType;
  price: number;
  startDate?: Date;
  endDate?: Date;
}

export interface ProfileSearchParams {
  category?: string;
  city?: string;
  query?: string;
  gender?: string;
  sortBy?: 'rating' | 'price' | 'newest' | 'distance';
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
