import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { User, UserType } from '../models/user.model';
import { DatabaseService } from './database.interface';
import { config } from '../config';
import { ConflictError, InternalServerError } from '../models/error.model';

/**
 * Supabase database implementation
 * Uses Supabase client for all database operations
 */
export class SupabaseDatabaseService implements DatabaseService {
  private client: SupabaseClient;

  constructor() {
    if (!config.supabase.url || !config.supabase.serviceKey) {
      throw new Error('Supabase configuration is missing');
    }

    this.client = createClient(
      config.supabase.url,
      config.supabase.serviceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }

  async createUser(user: User): Promise<User> {
    // Check if email already exists
    const existing = await this.getUserByEmail(user.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const { data, error } = await this.client
      .from('users')
      .insert([this.serializeUser(user)])
      .select()
      .single();

    if (error) {
      throw new InternalServerError(`Failed to create user: ${error.message}`);
    }

    return this.deserializeUser(data);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error || !data) {
      return null;
    }

    return this.deserializeUser(data);
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return null;
    }

    return this.deserializeUser(data);
  }

  async getUserByVerificationToken(token: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('email_verification_token', token)
      .single();

    if (error || !data) {
      return null;
    }

    return this.deserializeUser(data);
  }

  async getUserByPasswordResetTokenHash(tokenHash: string): Promise<User | null> {
    const { data, error } = await this.client
      .from('users')
      .select('*')
      .eq('password_reset_token_hash', tokenHash)
      .single();

    if (error || !data) {
      return null;
    }

    return this.deserializeUser(data);
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    // Serialize partial updates to snake_case
    const serializedUpdates: any = {};
    
    if ('emailVerified' in updates) serializedUpdates.email_verified = updates.emailVerified;
    if ('emailVerificationToken' in updates) serializedUpdates.email_verification_token = updates.emailVerificationToken || null;
    if ('emailVerificationExpires' in updates) serializedUpdates.email_verification_expires = updates.emailVerificationExpires?.toISOString() || null;
    if ('passwordResetTokenHash' in updates) serializedUpdates.password_reset_token_hash = updates.passwordResetTokenHash || null;
    if ('passwordResetExpires' in updates) serializedUpdates.password_reset_expires = updates.passwordResetExpires?.toISOString() || null;
    if ('passwordResetUsedAt' in updates) serializedUpdates.password_reset_used_at = updates.passwordResetUsedAt?.toISOString() || null;
    if ('tokenVersion' in updates) serializedUpdates.token_version = updates.tokenVersion;
    if ('isActive' in updates) serializedUpdates.is_active = updates.isActive;
    if ('privacyConsentAcceptedAt' in updates) serializedUpdates.privacy_consent_accepted_at = updates.privacyConsentAcceptedAt?.toISOString() || null;
    if ('softDeletedAt' in updates) serializedUpdates.soft_deleted_at = updates.softDeletedAt?.toISOString() || null;
    if ('password' in updates) serializedUpdates.password = updates.password;
    
    // Add updated_at timestamp
    serializedUpdates.updated_at = new Date().toISOString();
    
    const { data, error } = await this.client
      .from('users')
      .update(serializedUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Update user error:', error);
      return null;
    }

    return this.deserializeUser(data);
  }

  async deleteUser(id: string): Promise<boolean> {
    const { error } = await this.client.from('users').delete().eq('id', id);
    return !error;
  }

  // Helper methods to convert between camelCase and snake_case
  private serializeUser(user: User): any {
    const row: any = {
      id: user.id,
      email: user.email.toLowerCase(),
      password: user.password,
      user_type: user.userType,
      token_version: user.tokenVersion,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      is_active: user.isActive,
      email_verified: user.emailVerified,
      email_verification_token: user.emailVerificationToken || null,
      email_verification_expires: user.emailVerificationExpires?.toISOString() || null,
      password_reset_token_hash: user.passwordResetTokenHash || null,
      password_reset_expires: user.passwordResetExpires?.toISOString() || null,
      password_reset_used_at: user.passwordResetUsedAt?.toISOString() || null,
      // Type-specific fields
      ...(user.userType === UserType.ESCORT && {
        name: (user as any).name,
        phone: (user as any).phone,
        city: (user as any).city,
        age: (user as any).age,
      }),
      ...(user.userType === UserType.MEMBER && {
        username: (user as any).username,
        city: (user as any).city,
      }),
      ...(user.userType === UserType.AGENCY && {
        agency_name: (user as any).agencyName,
        phone: (user as any).phone,
        city: (user as any).city,
        website: (user as any).website,
      }),
      ...(user.userType === UserType.CLUB && {
        club_name: (user as any).clubName,
        phone: (user as any).phone,
        address: (user as any).address,
        city: (user as any).city,
        website: (user as any).website,
        opening_hours: (user as any).openingHours,
      }),
    };

    if (user.privacyConsentAcceptedAt !== undefined) {
      row.privacy_consent_accepted_at = user.privacyConsentAcceptedAt?.toISOString() || null;
    }
    if (user.softDeletedAt !== undefined) {
      row.soft_deleted_at = user.softDeletedAt?.toISOString() || null;
    }

    return row;
  }

  private deserializeUser(data: any): User {
    const baseUser = {
      id: data.id,
      email: data.email,
      password: data.password,
      userType: data.user_type as UserType,
      tokenVersion: data.token_version ?? 0,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      isActive: data.is_active,
      emailVerified: data.email_verified,
      emailVerificationToken: data.email_verification_token,
      emailVerificationExpires: data.email_verification_expires ? new Date(data.email_verification_expires) : undefined,
      passwordResetTokenHash: data.password_reset_token_hash || undefined,
      passwordResetExpires: data.password_reset_expires ? new Date(data.password_reset_expires) : undefined,
      passwordResetUsedAt: data.password_reset_used_at ? new Date(data.password_reset_used_at) : undefined,
      privacyConsentAcceptedAt: data.privacy_consent_accepted_at ? new Date(data.privacy_consent_accepted_at) : undefined,
      softDeletedAt: data.soft_deleted_at ? new Date(data.soft_deleted_at) : undefined,
    };

    switch (data.user_type) {
      case UserType.ESCORT:
        return {
          ...baseUser,
          name: data.name,
          phone: data.phone,
          city: data.city,
          age: data.age,
        } as User;
      case UserType.MEMBER:
        return {
          ...baseUser,
          username: data.username,
          city: data.city,
        } as User;
      case UserType.AGENCY:
        return {
          ...baseUser,
          agencyName: data.agency_name,
          phone: data.phone,
          city: data.city,
          website: data.website,
        } as User;
      case UserType.CLUB:
        return {
          ...baseUser,
          clubName: data.club_name,
          phone: data.phone,
          address: data.address,
          city: data.city,
          website: data.website,
          openingHours: data.opening_hours,
        } as User;
      default:
        throw new Error(`Unknown user type: ${data.user_type}`);
    }
  }
}
