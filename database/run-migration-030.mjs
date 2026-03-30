import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;
const sql = readFileSync(
  resolve(__dirname, 'migrations/030_launch_plan_emoji_option.sql'),
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
  console.log('Migration 030 applied with SSL: LAUNCH plan now includes the emoji title option.');
} catch (error) {
  if (String(error?.message || '').includes('does not support SSL')) {
    await runWithClient(false);
    console.log('Migration 030 applied without SSL: LAUNCH plan now includes the emoji title option.');
  } else {
    console.error('Error applying migration 030:', error.message);
    process.exit(1);
  }
}
