/**
 * seed-admin.ts
 * Crea (o promueve) el primer usuario administrador de la plataforma.
 *
 * Uso:
 *   npx ts-node database/seed-admin.ts [email] [name]
 *
 * Defaults:
 *   email : wildermancera1@gmail.com
 *   name  : Wilder Mancera
 *
 * El usuario se crea con force_password_change=true (sin contraseña).
 * Se envía un correo de invitación con un enlace único para configurar la contraseña.
 * Si el usuario ya existe y ya es ADMIN, el script no hace nada.
 * Si el usuario ya existe pero no es ADMIN, lo promueve y envía la invitación.
 *
 * Requiere en .env:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY,
 *   FRONTEND_URL, ADMIN_JWT_SECRET (o JWT_SECRET)
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? '';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET ?? process.env.JWT_SECRET ?? 'fallback-admin-secret';
const FRONTEND_URL = (process.env.FRONTEND_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const RESEND_API_KEY = process.env.RESEND_API_KEY ?? '';
const FROM_EMAIL = process.env.EMAIL_FROM ?? 'noreply@lusty.com';
const FROM_NAME = process.env.EMAIL_FROM_NAME ?? 'Lusty';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_URL y SUPABASE_SERVICE_KEY deben estar en .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateSetupToken(userId: string, email: string): string {
  return jwt.sign(
    { type: 'admin_setup', userId, email },
    ADMIN_JWT_SECRET,
    { expiresIn: '15m' },
  );
}

async function sendInvitationEmail(toEmail: string, setupLink: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY no está configurado — correo omitido. Enlace de configuración:');
    console.warn('   ' + setupLink);
    return;
  }

  const resend = new Resend(RESEND_API_KEY);
  const year = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido al Panel de Administración</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
         style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0"
             style="background:#111;border-radius:12px;border:1px solid #222;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#b8860b,#ffd700);padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#000;font-size:24px;font-weight:700;letter-spacing:2px;">
              LUXXX ADMIN
            </h1>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#ffd700;font-size:20px;">Configura tu contraseña</h2>
            <p style="margin:0 0 24px;color:#ccc;font-size:15px;line-height:1.6;">
              Has sido registrado como administrador de la plataforma Luxxx.
              Haz clic en el botón de abajo para crear tu contraseña de acceso.<br><br>
              El enlace expira en <strong style="color:#fff;">15 minutos</strong>.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="border-radius:8px;background:#ffd700;">
                  <a href="${setupLink}"
                     style="display:inline-block;padding:14px 32px;color:#000;
                            font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;">
                    Crear contraseña
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:24px 0 0;color:#555;font-size:13px;">
              Si no solicitaste este acceso, puedes ignorar este correo con seguridad.<br>
              Por seguridad, no compartas este enlace.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #222;text-align:center;">
            <p style="margin:0;color:#444;font-size:12px;">&copy; ${year} Luxxx Platform</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: toEmail,
    subject: 'Bienvenido al Panel de Administración — Crea tu contraseña',
    html,
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function seedAdmin(): Promise<void> {
  const email = (process.argv[2] ?? 'wildermancera1@gmail.com').toLowerCase().trim();
  const name = (process.argv[3] ?? 'Wilder Mancera').trim();

  console.log(`\n📋 Seed admin: ${email}`);

  // Check if user already exists
  const { data: existing, error: fetchErr } = await supabase
    .from('users')
    .select('id, email, role, force_password_change')
    .eq('email', email)
    .maybeSingle();

  if (fetchErr) {
    console.error('ERROR al consultar usuario:', fetchErr.message);
    process.exit(1);
  }

  if (existing) {
    if (existing.role === 'ADMIN') {
      console.log('✅ El usuario ya existe y ya es ADMIN — nada que hacer.');
      process.exit(0);
    }

    // Promote existing user to ADMIN
    const { error: updateErr } = await supabase
      .from('users')
      .update({
        role: 'ADMIN',
        force_password_change: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id);

    if (updateErr) {
      console.error('ERROR al promover usuario:', updateErr.message);
      process.exit(1);
    }

    const setupToken = generateSetupToken(existing.id, email);
    const setupLink = `${FRONTEND_URL}/admin-login?setup=${setupToken}`;
    await sendInvitationEmail(email, setupLink);

    console.log(`✅ Usuario existente promovido a ADMIN. Correo de invitación enviado a ${email}.`);
    process.exit(0);
  }

  // Create new admin user (no password — invitation flow)
  const newId = uuidv4();
  const now = new Date().toISOString();

  const { error: insertErr } = await supabase.from('users').insert({
    id: newId,
    email,
    password: '',
    user_type: 'member',
    role: 'ADMIN',
    name,
    username: name.toLowerCase().replace(/\s+/g, '_'),
    city: 'N/A',
    is_active: true,
    email_verified: true,
    force_password_change: true,
    token_version: 0,
    created_at: now,
    updated_at: now,
  });

  if (insertErr) {
    console.error('ERROR al crear el usuario admin:', insertErr.message);
    process.exit(1);
  }

  const setupToken = generateSetupToken(newId, email);
  const setupLink = `${FRONTEND_URL}/admin-login?setup=${setupToken}`;
  await sendInvitationEmail(email, setupLink);

  console.log(`✅ Usuario admin creado exitosamente.`);
  console.log(`   Email : ${email}`);
  console.log(`   Nombre: ${name}`);
  if (!RESEND_API_KEY) {
    console.log(`   Enlace: ${setupLink}`);
  } else {
    console.log(`   📧 Correo de invitación enviado a ${email}.`);
  }
}

seedAdmin().catch(err => {
  console.error('Error inesperado:', err);
  process.exit(1);
});
