import { User, UserType } from '../models/user.model';

export interface DatabaseService {
  createUser(user: User): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: string): Promise<User | null>;
  getUserByVerificationToken(token: string): Promise<User | null>;
  updateUser(id: string, updates: Partial<User>): Promise<User | null>;
  deleteUser(id: string): Promise<boolean>;
}
