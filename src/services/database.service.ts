import { DatabaseService } from './database.interface';
import { MemoryDatabaseService } from './memory-database.service';
import { PostgresDatabaseService } from './postgres-database.service';
import { SupabaseDatabaseService } from './supabase-database.service';
import { isDatabaseEnabled, isPostgresMode, isSupabaseMode, config } from '../config';

let databaseInstance: DatabaseService | null = null;

export const getDatabaseService = (): DatabaseService => {
  if (!databaseInstance) {
    if (isPostgresMode()) {
      console.log('✅ Using PostgreSQL direct connection');
      databaseInstance = new PostgresDatabaseService();
    } else if (isSupabaseMode()) {
      console.log('✅ Using Supabase database');
      databaseInstance = new SupabaseDatabaseService();
    } else {
      console.log('⚠️  Using in-memory database (data will be lost on restart)');
      databaseInstance = new MemoryDatabaseService();
    }
  }
  return databaseInstance;
};

export const resetDatabaseInstance = (): void => {
  databaseInstance = null;
};
