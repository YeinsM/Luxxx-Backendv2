import { Pool, PoolClient } from 'pg';
import { User, UserType } from '../models/user.model';
import { DatabaseService } from './database.interface';
import { config } from '../config';
import { ConflictError, InternalServerError } from '../models/error.model';

/**
 * PostgreSQL direct database implementation
 * Connects directly to a local or remote PostgreSQL instance using the pg driver.
 * No Supabase dependency required.
 */
export class PostgresDatabaseService implements DatabaseService {
  private pool: Pool;

  constructor() {
    if (!config.database.url) {
      throw new Error(
        'DATABASE_URL is not configured. Set it in .env (e.g., postgresql://postgres:password@localhost:5432/lusty_db)'
      );
    }

    this.pool = new Pool({
      connectionString: config.database.url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection on init
    this.pool
      .query('SELECT NOW()')
      .then(() => console.log('✅ PostgreSQL connection established'))
      .catch((err) => console.error('❌ PostgreSQL connection error:', err.message));
  }

  // ─── CRUD Operations ───────────────────────────────────────

  async createUser(user: User): Promise<User> {
    const existing = await this.getUserByEmail(user.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const serialized = this.serializeUser(user);
    const columns = Object.keys(serialized);
    const values = Object.values(serialized);
    const placeholders = columns.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO users (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    try {
      const result = await this.pool.query(query, values);
      return this.deserializeUser(result.rows[0]);
    } catch (error: any) {
      if (error.code === '23505') {
        // unique_violation
        throw new ConflictError('Email already registered');
      }
      throw new InternalServerError(`Failed to create user: ${error.message}`);
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await this.pool.query(query, [email.toLowerCase()]);
    return result.rows.length > 0 ? this.deserializeUser(result.rows[0]) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE id = $1';
    const result = await this.pool.query(query, [id]);
    return result.rows.length > 0 ? this.deserializeUser(result.rows[0]) : null;
  }

  async getUserByVerificationToken(token: string): Promise<User | null> {
    const query = 'SELECT * FROM users WHERE email_verification_token = $1';
    const result = await this.pool.query(query, [token]);
    return result.rows.length > 0 ? this.deserializeUser(result.rows[0]) : null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    // Build SET clause dynamically from the updates
    const snakeUpdates = this.partialSerialize(updates);
    snakeUpdates['updated_at'] = new Date().toISOString();

    const keys = Object.keys(snakeUpdates);
    const values = Object.values(snakeUpdates);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const query = `
      UPDATE users SET ${setClause}
      WHERE id = $${keys.length + 1}
      RETURNING *
    `;

    const result = await this.pool.query(query, [...values, id]);
    return result.rows.length > 0 ? this.deserializeUser(result.rows[0]) : null;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  // ─── Connection Management ─────────────────────────────────

  async testConnection(): Promise<boolean> {
    try {
      await this.pool.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // ─── Serialization Helpers ─────────────────────────────────

  private serializeUser(user: User): Record<string, any> {
    const base: Record<string, any> = {
      id: user.id,
      email: user.email.toLowerCase(),
      password: user.password,
      user_type: user.userType,
      is_active: user.isActive,
      email_verified: user.emailVerified,
      email_verification_token: user.emailVerificationToken || null,
      email_verification_expires:
        user.emailVerificationExpires?.toISOString() || null,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
    };

    switch (user.userType) {
      case UserType.ESCORT:
        base.name = (user as any).name;
        base.phone = (user as any).phone;
        base.city = (user as any).city;
        base.age = (user as any).age;
        break;
      case UserType.MEMBER:
        base.username = (user as any).username;
        base.city = (user as any).city;
        break;
      case UserType.AGENCY:
        base.agency_name = (user as any).agencyName;
        base.phone = (user as any).phone;
        base.city = (user as any).city;
        base.website = (user as any).website || null;
        break;
      case UserType.CLUB:
        base.club_name = (user as any).clubName;
        base.phone = (user as any).phone;
        base.address = (user as any).address;
        base.city = (user as any).city;
        base.website = (user as any).website || null;
        base.opening_hours = (user as any).openingHours || null;
        break;
    }

    return base;
  }

  private partialSerialize(updates: Partial<User>): Record<string, any> {
    const result: Record<string, any> = {};
    const mapping: Record<string, string> = {
      email: 'email',
      password: 'password',
      userType: 'user_type',
      isActive: 'is_active',
      emailVerified: 'email_verified',
      emailVerificationToken: 'email_verification_token',
      emailVerificationExpires: 'email_verification_expires',
      name: 'name',
      phone: 'phone',
      city: 'city',
      age: 'age',
      username: 'username',
      agencyName: 'agency_name',
      clubName: 'club_name',
      address: 'address',
      website: 'website',
      openingHours: 'opening_hours',
    };

    for (const [camelKey, value] of Object.entries(updates)) {
      const snakeKey = mapping[camelKey];
      if (snakeKey && value !== undefined) {
        result[snakeKey] =
          value instanceof Date ? value.toISOString() : value;
      }
    }
    return result;
  }

  private deserializeUser(data: any): User {
    const baseUser = {
      id: data.id,
      email: data.email,
      password: data.password,
      userType: data.user_type as UserType,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      isActive: data.is_active,
      emailVerified: data.email_verified,
      emailVerificationToken: data.email_verification_token,
      emailVerificationExpires: data.email_verification_expires
        ? new Date(data.email_verification_expires)
        : undefined,
      photos: [],
      videos: [],
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
