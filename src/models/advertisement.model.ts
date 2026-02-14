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
  websiteUrl?: string;
  
  // Promo
  promotedAt?: Date;
  promoSticker?: string;
  budget?: number;
  
  // Verification
  idType?: string;
  idNumber?: string;
  verificationStatus: 'pending' | 'submitted' | 'approved' | 'rejected';
  
  // Promotion campaign
  promotionType?: string;
  targetAudience?: string;
  campaignDuration?: string;
  
  // Stats
  viewCount: number;
  rating: number;
  reviewCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
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
  createdAt: Date;
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
  websiteUrl?: string;
  promoSticker?: string;
  budget?: number;
  // Step 2 - Verification
  idType?: string;
  idNumber?: string;
  // Step 3 - Promotion
  promotionType?: string;
  targetAudience?: string;
  campaignDuration?: string;
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

export interface ProfileSearchParams {
  category?: string;
  city?: string;
  query?: string;
  sortBy?: 'rating' | 'price' | 'newest' | 'distance';
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}
