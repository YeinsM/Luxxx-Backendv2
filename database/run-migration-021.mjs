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

const sql = readFileSync(resolve(__dirname, 'migrations/021_topbar_bg_image.sql'), 'utf8');

try {
  await client.query(sql);
  console.log('✅ Migration 021 applied: topbar_bg_image key in admin_settings.');
} catch (err) {
  console.error('❌ Error applying migration 021:', err.message);
  process.exit(1);
} finally {
  await client.end();
}
