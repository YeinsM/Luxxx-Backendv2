import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL_SUPABASE, ssl: { rejectUnauthorized: false } });

await client.connect();

const sql = readFileSync(resolve(__dirname, 'migrations/019_photo_verifications.sql'), 'utf8');

try {
  await client.query(sql);
  console.log('✅ Migration 019 applied: photo_verifications table + indexes.');
} catch (err) {
  console.error('❌ Error applying migration 019:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
