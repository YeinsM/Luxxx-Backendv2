import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;
const sql = readFileSync(
  resolve(__dirname, 'migrations/032_launch_credits_setting.sql'),
  'utf8',
);
const connectionString = process.env.DATABASE_URL_SUPABASE || process.env.DATABASE_URL;

async function runWithClient(ssl) {
  const client = new Client({
    connectionString,
    ssl,
  });

  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

try {
  await runWithClient({ rejectUnauthorized: false });
  console.log('Migration 032 applied with SSL: launch_credits_email_enabled setting added.');
} catch (error) {
  if (String(error?.message || '').includes('does not support SSL')) {
    await runWithClient(false);
    console.log('Migration 032 applied without SSL: launch_credits_email_enabled setting added.');
  } else {
    console.error('Error applying migration 032:', error.message);
    process.exit(1);
  }
}
