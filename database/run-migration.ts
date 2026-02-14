/**
 * Database Migration Runner
 * Executes SQL migration files against the configured database
 * 
 * Usage: npx ts-node database/run-migration.ts <migration-file>
 * Example: npx ts-node database/run-migration.ts database/migrations/002_full_schema.sql
 */
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  const migrationFile = process.argv[2];
  
  if (!migrationFile) {
    console.error('❌ Usage: npx ts-node database/run-migration.ts <migration-file>');
    process.exit(1);
  }

  const filePath = path.resolve(migrationFile);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(filePath, 'utf-8');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
  }

  console.log(`\n🔄 Running migration: ${path.basename(filePath)}`);
  console.log(`📡 Target: ${supabaseUrl}\n`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Use Supabase's rpc to execute raw SQL via the pg_net extension or sql function
  // Since Supabase JS client doesn't support raw SQL directly, we use the REST API
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
  });

  // Alternative: Use pg directly
  const { Pool } = await import('pg');
  
  // Build connection string for Supabase
  const dbHost = supabaseUrl.replace('https://', '').replace('.supabase.co', '');
  const connectionString = `postgresql://postgres.${dbHost}:${process.env.SUPABASE_DB_PASSWORD || ''}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
  
  // Try direct connection with DATABASE_URL or construct from Supabase
  const databaseUrl = process.env.DATABASE_URL_SUPABASE || connectionString;
  
  console.log('📦 Connecting via pg Pool...');
  
  const pool = new Pool({ connectionString: databaseUrl, ssl: { rejectUnauthorized: false } });
  
  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');
    
    await client.query(sql);
    console.log('✅ Migration executed successfully!');
    
    // Verify tables were created
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tables in database:');
    result.rows.forEach((row: any) => console.log(`   - ${row.table_name}`));
    
    client.release();
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  console.log('\n🎉 Migration complete!\n');
}

runMigration();
