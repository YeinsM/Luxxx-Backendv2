import pg from 'pg';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;
const sql = readFileSync(
  resolve(__dirname, 'migrations/031_dashboard_menu_settings.sql'),
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
  console.log('Migration 031 applied with SSL: Dashboard menu visibility settings added.');
} catch (error) {
  if (String(error?.message || '').includes('does not support SSL')) {
    await runWithClient(false);
    console.log('Migration 031 applied without SSL: Dashboard menu visibility settings added.');
  } else {
    console.error('Error applying migration 031:', error.message);
    process.exit(1);
  }
}
