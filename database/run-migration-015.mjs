import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL_SUPABASE, ssl: { rejectUnauthorized: false } });

await client.connect();

const sql = `ALTER TABLE advertisements ADD COLUMN IF NOT EXISTS selected_addons TEXT[] DEFAULT '{}';`;

try {
  await client.query(sql);
  console.log('✅ Migration 015 applied: selected_addons column added.');
} catch (err) {
  if (err.message.includes('already exists')) {
    console.log('ℹ️  Column selected_addons already exists. Skipping.');
  } else {
    console.error('❌ Error:', err.message);
  }
} finally {
  await client.end();
}
