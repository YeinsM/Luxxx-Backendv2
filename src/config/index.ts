import dotenv from 'dotenv';

dotenv.config();

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
    expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as string,
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
