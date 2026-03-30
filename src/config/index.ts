import dotenv from 'dotenv';

dotenv.config();

const parseNumberEnv = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampNumber = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

// ══════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ENTORNO
// ══════════════════════════════════════════════════════════════
// Todas las URLs y configuraciones se toman de variables de entorno
// Desarrollo: archivo .env local
// Producción: Variables configuradas en Render
// ══════════════════════════════════════════════════════════════

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DEFAULT_CORS_ORIGINS = [FRONTEND_URL, 'http://localhost:3000'];

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as string,
  },
  adminJwt: {
    // Separate secret for admin tokens — set ADMIN_JWT_SECRET in .env
    secret: process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'fallback-admin-secret',
    expiresIn: '4h' as string,
    setupTokenExpires: '15m' as string,
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },
  cors: {
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(url => url.trim())
      : DEFAULT_CORS_ORIGINS,
  },
  database: {
    mode: process.env.DB_MODE || 'memory',
    url: process.env.DATABASE_URL || '',
  },
  email: {
    // Resend API (Actual - en uso)
    resendApiKey: process.env.RESEND_API_KEY || '',
    
    // SMTP Config (comentado - para uso futuro)
    host: process.env.EMAIL_HOST || '',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    
    // Configuración general
    fromEmail: process.env.EMAIL_FROM || 'noreply@lusty.com',
    fromName: process.env.EMAIL_FROM_NAME || 'Lusty',
    frontendUrl: FRONTEND_URL,
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    modelImageWatermark: {
      publicId:
        process.env.CLOUDINARY_MODEL_WATERMARK_PUBLIC_ID ||
        'luxxx/branding/u4vxpxq1hbjthvs3085n',
      opacity: clampNumber(
        parseNumberEnv(process.env.CLOUDINARY_MODEL_WATERMARK_OPACITY, 45),
        0,
        100
      ),
      offsetX: Math.max(
        0,
        Math.round(parseNumberEnv(process.env.CLOUDINARY_MODEL_WATERMARK_OFFSET_X, 24))
      ),
      offsetY: Math.max(
        0,
        Math.round(parseNumberEnv(process.env.CLOUDINARY_MODEL_WATERMARK_OFFSET_Y, 24))
      ),
      relativeWidth: clampNumber(
        parseNumberEnv(process.env.CLOUDINARY_MODEL_WATERMARK_RELATIVE_WIDTH, 0.18),
        0.05,
        1
      ),
    },
  },
  zipcode: {
    apiKey: process.env.ZIPCODEBASE_API_KEY || '',
  },
};

export const isSupabaseEnabled = (): boolean => {
  return !!(config.supabase.url && config.supabase.anonKey);
};

export const isDatabaseEnabled = (): boolean => {
  return (
    (config.database.mode === 'supabase' || config.database.mode === 'postgres') &&
    !!config.database.url
  );
};

export const isPostgresMode = (): boolean => {
  return config.database.mode === 'postgres' && !!config.database.url;
};

export const isSupabaseMode = (): boolean => {
  return config.database.mode === 'supabase' && !!config.supabase.url && !!config.supabase.serviceKey;
};
