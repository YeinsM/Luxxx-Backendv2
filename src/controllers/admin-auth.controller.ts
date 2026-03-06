import { Request, Response, NextFunction } from 'express';
import { getDatabaseService } from '../services/database.service';
import { getEmailService } from '../services/email.service';
import { comparePassword, hashPassword } from '../utils/password.utils';
import {
  generateAdminToken,
  generateSetupToken,
  verifySetupToken,
} from '../utils/jwt.utils';
import { config } from '../config';
import { BadRequestError, UnauthorizedError } from '../models/error.model';

const db = getDatabaseService();

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || entry.resetAt < now) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 10) return true;
  entry.count++;
  return false;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return raw.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || 'unknown';
}

async function getAlertEmail(supabase: any): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'security_alert_email')
      .maybeSingle();
    return data?.value || null;
  } catch {
    return null;
  }
}

// ── POST /api/admin-auth/login ────────────────────────────────────────────────

export async function adminLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = getClientIp(req);

    // Rate-limit by IP
    if (isRateLimited(ip)) {
      res.status(429).json({ success: false, error: 'Demasiados intentos, intenta más tarde.' });
      return;
    }

    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || typeof email !== 'string') {
      throw new BadRequestError('El email es requerido');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = (db as any).client;

    // Look up user
    const { data: user } = await supabase
      .from('users')
      .select('id, email, password, role, user_type, is_active, token_version, force_password_change')
      .eq('email', normalizedEmail)
      .maybeSingle();

    // If not found or not an ADMIN → send alert and respond generically
    if (!user || user.role !== 'ADMIN') {
      // Fire-and-forget security alert
      const alertEmail = await getAlertEmail(supabase);
      if (alertEmail) {
        getEmailService().sendSuspiciousLoginAlert(alertEmail, {
          attemptedEmail: normalizedEmail,
          ip,
          userAgent: req.headers['user-agent'] || 'unknown',
          origin: req.headers.origin || req.headers.referer || 'unknown',
          timestamp: new Date().toLocaleString('es-ES', { timeZone: 'UTC' }) + ' UTC',
        }).catch(() => {}); // never throw on alert failure
      }
      console.warn(`[SECURITY] Admin login attempt for non-admin email: ${normalizedEmail} from IP: ${ip}`);
      // Generic error — never reveal if email exists
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Esta cuenta está inactiva');
    }

    // ── First-time login: no password set yet ─────────────────────────────────
    if (user.force_password_change) {
      // Generate a short-lived setup token and email it (never expose in response body)
      const setupToken = generateSetupToken(user.id, user.email);
      const setupLink = `${config.email.frontendUrl}/admin-login?setup=${setupToken}`;
      try {
        await getEmailService().sendAdminInvitationEmail(user.email, setupLink);
      } catch (emailErr) {
        // Log but don't fail the request — the admin can retry
        console.error('[admin-auth] Failed to send invitation email:', emailErr);
      }

      res.json({
        success: true,
        data: { setupEmailSent: true },
        message: 'Se ha enviado un enlace a tu correo para crear tu contraseña.',
      });
      return;
    }

    // ── Normal login ──────────────────────────────────────────────────────────
    if (!password) {
      throw new BadRequestError('La contraseña es requerida');
    }

    const validPassword = await comparePassword(password, user.password || '');
    if (!validPassword) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const token = generateAdminToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      tokenVersion: user.token_version ?? 0,
      role: 'ADMIN',
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: 'ADMIN',
          userType: user.user_type,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ── POST /api/admin-auth/set-password ────────────────────────────────────────

export async function adminSetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { setupToken, password } = req.body as { setupToken?: string; password?: string };

    if (!setupToken || !password) {
      throw new BadRequestError('setupToken y password son requeridos');
    }

    if (password.length < 8) {
      throw new BadRequestError('La contraseña debe tener al menos 8 caracteres');
    }

    // Verify the setup token (signed with adminJwt.secret, type must be 'admin_setup')
    let payload: ReturnType<typeof verifySetupToken>;
    try {
      payload = verifySetupToken(setupToken);
    } catch {
      throw new UnauthorizedError('El enlace ha expirado o no es válido. Solicita uno nuevo.');
    }

    const supabase = (db as any).client;

    // Confirm the user is still an ADMIN and still requires setup
    const { data: user } = await supabase
      .from('users')
      .select('id, email, role, force_password_change, user_type, token_version')
      .eq('id', payload.userId)
      .maybeSingle();

    if (!user || user.role !== 'ADMIN') {
      throw new UnauthorizedError('Usuario no válido');
    }

    if (!user.force_password_change) {
      // Already set — just do login instead (shouldn't happen normally)
      throw new BadRequestError('Esta cuenta ya tiene contraseña configurada. Inicia sesión normalmente.');
    }

    const hashed = await hashPassword(password);
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('users')
      .update({
        password: hashed,
        force_password_change: false,
        updated_at: now,
      })
      .eq('id', payload.userId);

    if (error) throw error;

    // Issue a full admin JWT so the user is immediately logged in
    const token = generateAdminToken({
      userId: user.id,
      email: user.email,
      userType: user.user_type,
      tokenVersion: user.token_version ?? 0,
      role: 'ADMIN',
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: 'ADMIN',
          userType: user.user_type,
        },
      },
      message: '¡Contraseña creada! Has iniciado sesión.',
    });
  } catch (err) {
    next(err);
  }
}
