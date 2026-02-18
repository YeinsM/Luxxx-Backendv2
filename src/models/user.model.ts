export enum UserType {
  ESCORT = 'escort',
  MEMBER = 'member',
  AGENCY = 'agency',
  CLUB = 'club',
}

export interface MediaFile {
  url: string;
  publicId: string;
  width?: number;
  height?: number;
  format?: string;
  resourceType: 'image' | 'video';
  uploadedAt: Date;
}

export interface BaseUser {
  id: string;
  email: string;
  password: string;
  tokenVersion: number;
  userType: UserType;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  softDeletedAt?: Date;
  emailVerified: boolean;
  privacyConsentAcceptedAt?: Date;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetTokenHash?: string;
  passwordResetExpires?: Date;
  passwordResetUsedAt?: Date;
  photos: MediaFile[];
  videos: MediaFile[];
}

export interface EscortUser extends BaseUser {
  userType: UserType.ESCORT;
  name: string;
  phone: string;
  city: string;
  age: number;
}

export interface MemberUser extends BaseUser {
  userType: UserType.MEMBER;
  username: string;
  city: string;
}

export interface AgencyUser extends BaseUser {
  userType: UserType.AGENCY;
  agencyName: string;
  phone: string;
  city: string;
  website?: string;
}

export interface ClubUser extends BaseUser {
  userType: UserType.CLUB;
  clubName: string;
  phone: string;
  address: string;
  city: string;
  website?: string;
  openingHours?: string;
}

export type User = EscortUser | MemberUser | AgencyUser | ClubUser;

// DTO Types for Registration
export interface RegisterEscortDto {
  name: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  age: number;
}

export interface RegisterMemberDto {
  username: string;
  email: string;
  password: string;
  city: string;
}

export interface RegisterAgencyDto {
  agencyName: string;
  email: string;
  password: string;
  phone: string;
  city: string;
  website?: string;
}

export interface RegisterClubDto {
  clubName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
  city: string;
  website?: string;
  openingHours?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

// Response types
export interface AuthResponse {
  user: Omit<User, 'password'>;
  token: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface RegistrationResponse {
  success: boolean;
  message: string;
  email: string;
}

export interface ResendVerificationDto {
  email: string;
}
