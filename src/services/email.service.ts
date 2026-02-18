// ══════════════════════════════════════════════════════════════
// OPCIÓN 1: RESEND API (ACTUAL - EN USO) ✅
// ══════════════════════════════════════════════════════════════
import { Resend } from 'resend';
import { config } from '../config';
import { User, UserType } from '../models/user.model';

/**
 * Email Service using Resend API for sending notifications
 * Resend works better in cloud platforms like Render (no SMTP port blocks)
 */
export class EmailService {
  private resend: Resend | null = null;

  constructor() {
    this.initializeResend();
  }

  private initializeResend(): void {
    if (!config.email.resendApiKey) {
      console.log('⚠️  Resend Email service not configured - emails will not be sent');
      console.log(`   RESEND_API_KEY: ${config.email.resendApiKey ? '***SET***' : 'NOT SET'}`);
      return;
    }

    try {
      this.resend = new Resend(config.email.resendApiKey);
      console.log('✅ Email service initialized (Resend API)');
      console.log(`   From: ${config.email.fromEmail}`);
    } catch (error) {
      console.error('❌ Failed to initialize Resend email service:', error);
    }
  }

  // ══════════════════════════════════════════════════════════════
  // OPCIÓN 2: NODEMAILER SMTP (COMENTADO - PARA USO FUTURO)
  // ══════════════════════════════════════════════════════════════
  // import nodemailer, { Transporter } from 'nodemailer';
  // private transporter: Transporter | null = null;
  //
  // private initializeTransporter(): void {
  //   if (!config.email.host || !config.email.user || !config.email.password) {
  //     console.log('⚠️  Email service not configured - emails will not be sent');
  //     console.log(`   Host: ${config.email.host || 'NOT SET'}`);
  //     console.log(`   User: ${config.email.user || 'NOT SET'}`);
  //     console.log(`   Password: ${config.email.password ? '***SET***' : 'NOT SET'}`);
  //     return;
  //   }
  //
  //   try {
  //     this.transporter = nodemailer.createTransport({
  //       host: config.email.host,
  //       port: config.email.port,
  //       secure: config.email.secure,
  //       requireTLS: true,
  //       auth: {
  //         user: config.email.user,
  //         pass: config.email.password,
  //       },
  //       tls: {
  //         ciphers: 'SSLv3',
  //         rejectUnauthorized: false,
  //       },
  //       debug: true,
  //       logger: true,
  //     });
  //
  //     console.log('✅ Email service initialized (SMTP)');
  //     console.log(`   SMTP: ${config.email.host}:${config.email.port}`);
  //     console.log(`   User: ${config.email.user}`);
  //
  //     if (config.nodeEnv !== 'production') {
  //       this.transporter.verify((error, success) => {
  //         if (error) {
  //           console.warn('⚠️  SMTP connection verification failed:', error.message);
  //         } else {
  //           console.log('✅ SMTP server is ready to send emails');
  //         }
  //       });
  //     }
  //   } catch (error) {
  //     console.error('❌ Failed to initialize email service:', error);
  //   }
  // }
  // ══════════════════════════════════════════════════════════════

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(user: User): Promise<boolean> {
    if (!this.resend) {
      console.log('❌ Email not sent - Resend not configured');
      return false;
    }

    try {
      const subject = this.getWelcomeSubject(user.userType);
      const html = this.getWelcomeTemplate(user);
      const text = this.getWelcomeTextVersion(user);

      console.log(`📧 Sending welcome email to ${user.email}...`);

      const { data, error } = await this.resend.emails.send({
        from: `${config.email.fromName} <${config.email.fromEmail}>`,
        to: [user.email],
        subject,
        html,
        text,
      });

      if (error) {
        console.error('❌ Failed to send welcome email:', error);
        return false;
      }

      console.log(`✅ Welcome email sent successfully to ${user.email}`);
      console.log(`   Message ID: ${data?.id}`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send welcome email:', error.message);
      return false;
    }

    // ══════════════════════════════════════════════════════════════
    // SMTP VERSION (COMENTADO - PARA USO FUTURO)
    // ══════════════════════════════════════════════════════════════
    // if (!this.transporter) {
    //   console.log('❌ Email not sent - transporter not configured');
    //   return false;
    // }
    //
    // try {
    //   const subject = this.getWelcomeSubject(user.userType);
    //   const html = this.getWelcomeTemplate(user);
    //   const text = this.getWelcomeTextVersion(user);
    //
    //   console.log(`📧 Sending welcome email to ${user.email}...`);
    //
    //   const info = await this.transporter.sendMail({
    //     from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
    //     to: user.email,
    //     subject,
    //     text,
    //     html,
    //     headers: {
    //       'X-Priority': '3',
    //       'X-Mailer': 'Lusty Platform',
    //       'List-Unsubscribe': `<mailto:unsubscribe@techbrains.com.do>`,
    //     },
    //   });
    //
    //   console.log(`✅ Welcome email sent successfully to ${user.email}`);
    //   console.log(`   Message ID: ${info.messageId}`);
    //   return true;
    // } catch (error: any) {
    //   console.error('❌ Failed to send welcome email:', error.message);
    //   return false;
    // }
    // ══════════════════════════════════════════════════════════════
  }

  /**
   * Send email verification
   */
  async sendVerificationEmail(user: User, verificationToken: string): Promise<boolean> {
    if (!this.resend) {
      console.log('❌ Email not sent - Resend not configured');
      return false;
    }

    try {
      const verificationUrl = `${config.email.frontendUrl}/verify-email?token=${verificationToken}`;
      
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Verifica tu Email</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                        Hola,
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                        Por favor verifica tu dirección de email haciendo clic en el botón de abajo:
                      </p>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                              Verificar Email
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 30px 0 0 0;">
                        Si no creaste esta cuenta, puedes ignorar este email.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                      <p style="color: #6c757d; font-size: 12px; margin: 0;">
                        © ${new Date().getFullYear()} Lusty. Todos los derechos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const { data, error } = await this.resend.emails.send({
        from: `${config.email.fromName} <${config.email.fromEmail}>`,
        to: [user.email],
        subject: 'Verifica tu email - Lusty',
        html,
      });

      if (error) {
        console.error('❌ Failed to send verification email:', error);
        return false;
      }

      console.log(`✅ Verification email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send verification email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(user: User, resetToken: string): Promise<boolean> {
    if (!this.resend) {
      console.log('❌ Email not sent - Resend not configured');
      return false;
    }

    try {
      const resetUrl = `${config.email.frontendUrl}/reset-password?token=${resetToken}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px;">Recuperar contraseña</h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                        Recibimos una solicitud para restablecer tu contraseña.
                      </p>
                      <p style="color: #333333; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                        Haz clic en el botón para crear una nueva contraseña. Este enlace expira en 30 minutos y solo puede usarse una vez.
                      </p>

                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                              Restablecer contraseña
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666666; font-size: 13px; line-height: 20px; margin: 30px 0 0 0; word-break: break-all;">
                        Si el botón no funciona, copia y pega este enlace:<br/>
                        <a href="${resetUrl}">${resetUrl}</a>
                      </p>

                      <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 20px 0 0 0;">
                        Si no solicitaste este cambio, ignora este correo.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      const { data, error } = await this.resend.emails.send({
        from: `${config.email.fromName} <${config.email.fromEmail}>`,
        to: [user.email],
        subject: 'Restablecer contraseña - Lusty',
        html,
      });

      if (error) {
        console.error('❌ Failed to send password reset email:', error);
        return false;
      }

      console.log(`✅ Password reset email sent to ${user.email}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return false;
    }
  }

  private getWelcomeSubject(userType: UserType): string {
    const subjects = {
      escort: '¡Bienvenida a Lusty! 💃',
      member: '¡Bienvenido a Lusty! 🎉',
      agency: '¡Bienvenida tu Agencia a Lusty! 🏢',
      club: '¡Bienvenido tu Club a Lusty! 🎪',
    };
    return subjects[userType];
  }

  /**
   * Obtiene versión de texto plano del email de bienvenida
   */
  private getWelcomeTextVersion(user: User): string {
    const { userType } = user;
    let name = user.email;
    
    // Determinar el nombre según el tipo de usuario
    switch (userType) {
      case 'member':
        name = (user as any).username || user.email;
        break;
      case 'escort':
        name = (user as any).name || user.email;
        break;
      case 'agency':
        name = (user as any).agencyName || user.email;
        break;
      case 'club':
        name = (user as any).clubName || user.email;
        break;
    }

    return `
Hola ${name},

¡Bienvenido a Lusty!

Tu cuenta ha sido creada exitosamente.

Tipo de cuenta: ${userType.charAt(0).toUpperCase() + userType.slice(1)}
Email: ${user.email}

Tu cuenta está ahora en revisión. Recibirás una notificación cuando sea aprobada.

Mientras tanto, puedes:
- Completar tu perfil
- Explorar la plataforma
- Configurar tus preferencias

Si tienes alguna pregunta, no dudes en contactarnos.

Saludos,
El equipo de Lusty

---
Este es un correo automático, por favor no respondas a este mensaje.
    `.trim();
  }

  private getWelcomeTemplate(user: User): string {
    const templates = {
      escort: this.getEscortWelcomeTemplate(user),
      member: this.getMemberWelcomeTemplate(user),
      agency: this.getAgencyWelcomeTemplate(user),
      club: this.getClubWelcomeTemplate(user),
    };
    return templates[user.userType];
  }

  private getEscortWelcomeTemplate(user: User): string {
    const name = (user as any).name || user.email;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Bienvenida a Lusty!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 20px 20px 0 0; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 32px; font-weight: bold;">¡Bienvenida Sexy ${name}! 💃</h1>
                    <p style="color: #ffffff; margin: 0; font-size: 18px; opacity: 0.95;">Tu perfil de modelo está listo</p>
                  </td>
                </tr>
              </table>
              
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 0 0 20px 20px; overflow: hidden;">
                <!-- Sección principal -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #ffffff; margin: 0 0 15px 0; font-size: 24px; font-weight: bold;">¡Es hora de brillar! ✨</h2>
                    
                    <p style="color: #d1d5db; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                      Tu cuenta ha sido creada exitosamente. Ahora puedes comenzar a promocionar tus servicios y conectar con clientes potenciales.
                    </p>
                    
                    <!-- Box de Próximos Pasos -->
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 25px; margin: 25px 0; border-radius: 8px;">
                      <p style="color: #f472b6; margin: 0 0 20px 0; font-weight: bold; font-size: 16px;">📋 Próximos pasos:</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; font-size: 15px;">• Completa tu perfil con fotos profesionales</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; font-size: 15px;">• Agrega una descripción detallada de tus servicios</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; font-size: 15px;">• Configura tus tarifas y disponibilidad</p>
                      <p style="color: #fecdd3; margin: 0; font-size: 15px;">• Activa las notificaciones para no perder clientes</p>
                    </div>
                    
                    <!-- Botón con gradiente -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <a href="${config.email.frontendUrl}/admin" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 16px;">
                            Ir a mi Panel
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 20px 0 0 0; text-align: center;">
                      Si tienes alguna pregunta, no dudes en contactarnos.
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 25px 40px; text-align: center;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      Lusty Platform © ${new Date().getFullYear()} - Todos los derechos reservados
                    </p>
                    <p style="color: #999999; font-size: 11px; margin: 10px 0 0 0;">
                      Este es un correo automático. Por favor no responder.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private getMemberWelcomeTemplate(user: User): string {
    const username = 'username' in user ? user.username : user.email;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Bienvenido a Lusty! 🎉</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 8px; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">¡Bienvenido @${username}! 🎉</h1>
                    <p style="color: #fce7f3; margin: 0; font-size: 16px;">Tu cuenta de miembro está lista</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #f472b6; font-size: 24px; margin: 0 0 20px 0;">¡Todo listo para explorar! ✨</h2>
                    
                    <p style="color: #e5e7eb; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      Tu cuenta de miembro ha sido registrada exitosamente en nuestra plataforma. Ya puedes disfrutar de todas las funcionalidades exclusivas.
                    </p>
                    
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="color: #f472b6; margin: 0 0 15px 0; font-weight: bold; font-size: 18px;">Características de tu cuenta 📋</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Gestión de favoritos</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Sistema de valoraciones</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Notificaciones personalizadas</p>
                      <p style="color: #fecdd3; margin: 0; padding-left: 20px;">✓ Preferencias de búsqueda</p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0 10px 0;">
                          <a href="${config.email.frontendUrl}" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                            Explorar Plataforma 🚀
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                      ¿Necesitas ayuda? Estamos aquí para ti 💬
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      Lusty Platform - ${new Date().getFullYear()}
                    </p>
                    <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                      Este es un correo automático. Por favor no responder.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private getAgencyWelcomeTemplate(user: User): string {
    const agencyName = 'agencyName' in user ? user.agencyName : user.email;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Agencia Registrada! 🏢</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 8px; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">¡Bienvenida ${agencyName}! 🏢</h1>
                    <p style="color: #fce7f3; margin: 0; font-size: 16px;">Tu agencia ha sido registrada</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #f472b6; font-size: 24px; margin: 0 0 20px 0;">¡Cuenta en revisión! ⏳</h2>
                    
                    <p style="color: #e5e7eb; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      Tu agencia ha sido registrada exitosamente en nuestra plataforma. Estamos revisando tu información y pronto recibirás una notificación de aprobación.
                    </p>
                    
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="color: #f472b6; margin: 0 0 15px 0; font-weight: bold; font-size: 18px;">Panel de administración 📋</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Gestión de perfiles de modelos</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Información de la agencia</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Sistema de reservas</p>
                      <p style="color: #fecdd3; margin: 0; padding-left: 20px;">✓ Reportes y estadísticas</p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0 10px 0;">
                          <a href="${config.email.frontendUrl}/admin" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                            Acceder al Panel 🚀
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                      ¿Necesitas ayuda? Estamos aquí para ti 💬
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      Lusty Platform - ${new Date().getFullYear()}
                    </p>
                    <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                      Este es un correo automático. Por favor no responder.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }

  private getClubWelcomeTemplate(user: User): string {
    const clubName = 'clubName' in user ? user.clubName : user.email;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>¡Club Registrado! 🎪</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 8px; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">¡Bienvenido ${clubName}! 🎪</h1>
                    <p style="color: #fce7f3; margin: 0; font-size: 16px;">Tu establecimiento ha sido registrado</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #f472b6; font-size: 24px; margin: 0 0 20px 0;">¡Cuenta en revisión! ⏳</h2>
                    
                    <p style="color: #e5e7eb; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      Tu establecimiento ha sido registrado exitosamente en nuestra plataforma. Estamos revisando tu información y pronto recibirás una notificación de aprobación.
                    </p>
                    
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="color: #f472b6; margin: 0 0 15px 0; font-weight: bold; font-size: 18px;">Panel de administración 📋</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Galería de fotos del local</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Horarios y eventos</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">✓ Servicios y tarifas</p>
                      <p style="color: #fecdd3; margin: 0; padding-left: 20px;">✓ Promociones especiales</p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0 10px 0;">
                          <a href="${config.email.frontendUrl}/admin" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                            Acceder al Panel 🚀
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                      ¿Necesitas ayuda? Estamos aquí para ti 💬
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      Lusty Platform - ${new Date().getFullYear()}
                    </p>
                    <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                      Este es un correo automático. Por favor no responder.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  }
}

// Singleton instance
let emailServiceInstance: EmailService | null = null;

export const getEmailService = (): EmailService => {
  if (!emailServiceInstance) {
    emailServiceInstance = new EmailService();
  }
  return emailServiceInstance;
};
