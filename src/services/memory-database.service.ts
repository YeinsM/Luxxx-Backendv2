import { User } from '../models/user.model';
import { DatabaseService } from './database.interface';
import { ConflictError } from '../models/error.model';

/**
 * In-memory database implementation for local development
 * Data persists only during runtime
 */
export class MemoryDatabaseService implements DatabaseService {
  private users: Map<string, User> = new Map();

  async createUser(user: User): Promise<User> {
    // Check if email already exists
    const existing = await this.getUserByEmail(user.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    this.users.set(user.id, user);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    return user || null;
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByVerificationToken(token: string): Promise<User | null> {
    const users = Array.from(this.users.values());
    const user = users.find((u) => u.emailVerificationToken === token);
    return user || null;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.getUserById(id);
    if (!user) {
      return null;
    }

    const updatedUser = { ...user, ...updates, updatedAt: new Date() } as User;
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  // Utility method for development
  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  clear(): void {
    this.users.clear();
  }
}
