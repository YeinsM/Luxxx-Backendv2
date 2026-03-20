import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL_SUPABASE, ssl: { rejectUnauthorized: false } });

await client.connect();

const rows = [
  { key: 'app_name',         value: 'Luxxx' },
  { key: 'app_logo_url',     value: '' },
  { key: 'app_logo_dark_url', value: '' },
  { key: 'app_favicon_url',  value: '' },
];

try {
  for (const row of rows) {
    await client.query(
      `INSERT INTO admin_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO NOTHING`,
      [row.key, row.value]
    );
    console.log(`✅ Upserted setting: ${row.key}`);
  }
  console.log('✅ Migration 016 applied: branding settings added.');
} catch (err) {
  console.error('❌ Error:', err.message);
} finally {
  await client.end();
}
