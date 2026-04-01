// ══════════════════════════════════════════════════════════════
// OPCIÓN 1: RESEND API (ACTUAL - EN USO) ✅
// ══════════════════════════════════════════════════════════════
import { Resend } from 'resend';
import { config } from '../config';
import { User, UserType } from '../models/user.model';
import { getAppDatabaseService } from './app-database.service';
import { EmailLang, resolveEmailLang, emailT } from '../utils/email-translations';

type EmailBranding = {
  appName: string;
  logoUrl: string | null;
  darkLogoUrl: string | null;
  emailLogoUrl: string | null;
};

type EmailLayoutOptions = {
  branding: EmailBranding;
  headerHtml: string;
  bodyHtml: string;
  lang?: EmailLang;
  title?: string;
  width?: number;
  outerPadding?: string;
  headerPadding?: string;
  bodyPadding?: string;
  headerBackground?: string;
  contentBackground?: string;
  footerHtml?: string;
};

/**
 * Email Service using Resend API for sending notifications
 * Resend works better in cloud platforms like Render (no SMTP port blocks)
 */
export class EmailService {
  private resend: Resend | null = null;
  private readonly emailTheme = {
    pageBg: '#1f2937',
    cardBg: '#2d3748',
    panelBg: '#374151',
    footerBg: '#1f2937',
    headerGradient: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
    textPrimary: '#ffffff',
    textSecondary: '#d1d5db',
    textMuted: '#9ca3af',
    footerText: '#6b7280',
    footerNote: '#999999',
  };

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

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => {
      switch (char) {
        case '&':
          return '&amp;';
        case '<':
          return '&lt;';
        case '>':
          return '&gt;';
        case '"':
          return '&quot;';
        case "'":
          return '&#39;';
        default:
          return char;
      }
    });
  }

  private async getEmailBranding(): Promise<EmailBranding> {
    try {
      const db = getAppDatabaseService();
      const [appName, logoUrl, darkLogoUrl, emailLogoUrl] = await Promise.all([
        db.getAdminSetting('app_name'),
        db.getAdminSetting('app_logo_url'),
        db.getAdminSetting('app_logo_dark_url'),
        db.getAdminSetting('app_email_logo_url'),
      ]);

      return {
        appName: appName?.trim() || config.email.fromName || 'Lusty',
        logoUrl: logoUrl?.trim() || null,
        darkLogoUrl: darkLogoUrl?.trim() || logoUrl?.trim() || null,
        emailLogoUrl: emailLogoUrl?.trim() || null,
      };
    } catch {
      return {
        appName: config.email.fromName || 'Lusty',
        logoUrl: null,
        darkLogoUrl: null,
        emailLogoUrl: null,
      };
    }
  }

  private getFromAddress(branding: EmailBranding): string {
    return `${branding.appName} <${config.email.fromEmail}>`;
  }

  private renderBrandLogo(
    branding: EmailBranding,
    options: {
      dark?: boolean;
      maxWidth?: number;
      marginBottom?: number;
    } = {},
  ): string {
    const { dark = false, maxWidth = 180, marginBottom = 20 } = options;
    const logoUrl = branding.emailLogoUrl || (dark
      ? branding.darkLogoUrl || branding.logoUrl
      : branding.logoUrl || branding.darkLogoUrl);

    if (!logoUrl) {
      return `<div style="color:${dark ? '#ffffff' : '#111827'};font-size:28px;font-weight:800;letter-spacing:-0.5px;margin:0 0 ${marginBottom}px 0;">${this.escapeHtml(branding.appName)}</div>`;
    }

    return `<img src="${this.escapeHtml(logoUrl)}" alt="${this.escapeHtml(branding.appName)}" style="display:block;max-width:${maxWidth}px;width:100%;height:auto;margin:0 auto ${marginBottom}px auto;" />`;
  }

  private getCopyrightLine(branding: EmailBranding, lang: EmailLang = 'es'): string {
    return `© ${new Date().getFullYear()} ${this.escapeHtml(branding.appName)}. ${emailT(lang, 'copyrightSuffix')}`;
  }

  private getRegistrationDisplayName(user: User): string {
    if ('name' in user && user.name) {
      return user.name;
    }

    if ('username' in user && user.username) {
      return user.username;
    }

    if ('agencyName' in user && user.agencyName) {
      return user.agencyName;
    }

    if ('clubName' in user && user.clubName) {
      return user.clubName;
    }

    return user.email;
  }

  private getRegistrationUserTypeLabel(userType: UserType): string {
    switch (userType) {
      case UserType.ESCORT:
        return 'Escort';
      case UserType.MEMBER:
        return 'Miembro';
      case UserType.AGENCY:
        return 'Agencia';
      case UserType.CLUB:
        return 'Club';
      default:
        return 'Usuario';
    }
  }

  private renderEmailFooter(
    branding: EmailBranding,
    lang: EmailLang = 'es',
    noticeText: string | null = emailT(lang, 'autoEmailNotice'),
  ): string {
    const noticeHtml = noticeText
      ? `<p style="color: ${this.emailTheme.footerNote}; font-size: 11px; margin: 10px 0 0 0;">${noticeText}</p>`
      : '';

    return `
      <p style="color: ${this.emailTheme.footerText}; font-size: 13px; margin: 0;">
        ${this.getCopyrightLine(branding, lang)}
      </p>
      ${noticeHtml}
    `;
  }

  private renderLaunchThemeEmail({
    branding,
    headerHtml,
    bodyHtml,
    lang = 'es',
    title,
    width = 600,
    outerPadding = '30px 0',
    headerPadding = '50px 40px',
    bodyPadding = '40px',
    headerBackground = this.emailTheme.headerGradient,
    contentBackground = this.emailTheme.cardBg,
    footerHtml = this.renderEmailFooter(branding, lang),
  }: EmailLayoutOptions): string {
    const safeTitle = title ? `<title>${this.escapeHtml(title)}</title>` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${safeTitle}
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: ${this.emailTheme.pageBg};">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${this.emailTheme.pageBg}; padding: ${outerPadding};">
          <tr>
            <td align="center">
              <table width="${width}" cellpadding="0" cellspacing="0" style="background: ${headerBackground}; border-radius: 20px 20px 0 0; overflow: hidden;">
                <tr>
                  <td style="padding: ${headerPadding}; text-align: center;">
                    ${headerHtml}
                  </td>
                </tr>
              </table>

              <table width="${width}" cellpadding="0" cellspacing="0" style="background-color: ${contentBackground}; border-radius: 0 0 20px 20px; overflow: hidden;">
                <tr>
                  <td style="padding: ${bodyPadding};">
                    ${bodyHtml}
                  </td>
                </tr>
                <tr>
                  <td style="background-color: ${this.emailTheme.footerBg}; padding: 25px 40px; text-align: center;">
                    ${footerHtml}
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
      const branding = await this.getEmailBranding();
      const lang = resolveEmailLang(user.preferredLanguage);
      const subject = this.getWelcomeSubject(user.userType, branding.appName, lang);
      const html = this.getWelcomeTemplate(user, branding, lang);
      const text = this.getWelcomeTextVersion(user, branding.appName, lang);

      console.log(`📧 Sending welcome email to ${user.email}...`);

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
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
      const branding = await this.getEmailBranding();
      const lang = resolveEmailLang(user.preferredLanguage);
      const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 18 });
      const verificationUrl = `${config.email.frontendUrl}/verify-email?token=${verificationToken}`;
      const headerHtml = `
        ${brandLogo}
        <h1 style="color: ${this.emailTheme.textPrimary}; margin: 0; font-size: 30px; font-weight: bold;">${emailT(lang, 'verifyEmailTitle')}</h1>
      `;
      const bodyHtml = `
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
          ${emailT(lang, 'verifyEmailGreeting')}
        </p>
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
          ${emailT(lang, 'verifyEmailBody')}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 20px 0 24px 0;">
              <a href="${verificationUrl}" style="background: ${this.emailTheme.headerGradient}; color: ${this.emailTheme.textPrimary}; padding: 15px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                ${emailT(lang, 'verifyEmailButton')}
              </a>
            </td>
          </tr>
        </table>

        <p style="color: ${this.emailTheme.textMuted}; font-size: 14px; line-height: 20px; margin: 0;">
          ${emailT(lang, 'verifyEmailIgnore')}
        </p>
      `;
      const html = this.renderLaunchThemeEmail({
        branding,
        lang,
        title: emailT(lang, 'verifyEmailTitle'),
        headerHtml,
        bodyHtml,
        headerPadding: '40px 20px',
        bodyPadding: '40px 30px',
        outerPadding: '20px',
        footerHtml: this.renderEmailFooter(branding, lang, null),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [user.email],
        subject: `${emailT(lang, 'verifyEmailSubject')} - ${branding.appName}`,
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
      const branding = await this.getEmailBranding();
      const lang = resolveEmailLang(user.preferredLanguage);
      const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 18 });
      const resetUrl = `${config.email.frontendUrl}/reset-password?token=${resetToken}`;
      const headerHtml = `
        ${brandLogo}
        <h1 style="color: ${this.emailTheme.textPrimary}; margin: 0; font-size: 30px; font-weight: bold;">${emailT(lang, 'resetPasswordTitle')}</h1>
      `;
      const bodyHtml = `
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
          ${emailT(lang, 'resetPasswordBody1')}
        </p>
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
          ${emailT(lang, 'resetPasswordBody2')}
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 20px 0 24px 0;">
              <a href="${resetUrl}" style="background: ${this.emailTheme.headerGradient}; color: ${this.emailTheme.textPrimary}; padding: 15px 40px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                ${emailT(lang, 'resetPasswordButton')}
              </a>
            </td>
          </tr>
        </table>

        <p style="color: ${this.emailTheme.textMuted}; font-size: 13px; line-height: 20px; margin: 0 0 20px 0; word-break: break-all;">
          ${emailT(lang, 'resetPasswordFallback')}<br/>
          <a href="${resetUrl}" style="color: #f9a8d4;">${resetUrl}</a>
        </p>

        <p style="color: ${this.emailTheme.textMuted}; font-size: 14px; line-height: 20px; margin: 0;">
          ${emailT(lang, 'resetPasswordIgnore')}
        </p>
      `;
      const html = this.renderLaunchThemeEmail({
        branding,
        lang,
        title: emailT(lang, 'resetPasswordTitle'),
        headerHtml,
        bodyHtml,
        headerPadding: '40px 20px',
        bodyPadding: '40px 30px',
        outerPadding: '20px',
        footerHtml: this.renderEmailFooter(branding, lang, null),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [user.email],
        subject: `${emailT(lang, 'resetPasswordSubject')} - ${branding.appName}`,
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

  private getWelcomeSubject(userType: UserType, appName: string, lang: EmailLang = 'es'): string {
    const subjectKeys: Record<UserType, string> = {
      escort: 'escortWelcomeSubject',
      member: 'memberWelcomeSubject',
      agency: 'agencyWelcomeSubject',
      club: 'clubWelcomeSubject',
    };
    const emojis: Record<UserType, string> = {
      escort: '💃',
      member: '🎉',
      agency: '🏢',
      club: '🎪',
    };
    return `${emailT(lang, subjectKeys[userType])} ${appName}! ${emojis[userType]}`;
  }

  /**
   * Obtiene versión de texto plano del email de bienvenida
   */
  private getWelcomeTextVersion(user: User, appName: string, lang: EmailLang = 'es'): string {
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
${emailT(lang, 'welcomeTextGreeting')} ${name},

${emailT(lang, 'welcomeTextWelcome')} ${appName}!

${emailT(lang, 'welcomeAccountCreated')}

${emailT(lang, 'welcomeAccountType')}: ${userType.charAt(0).toUpperCase() + userType.slice(1)}
Email: ${user.email}

${emailT(lang, 'welcomeUnderReview')}

${emailT(lang, 'welcomeWhileMeantime')}
- ${emailT(lang, 'welcomeCompleteProfile')}
- ${emailT(lang, 'welcomeExplorePlatform')}
- ${emailT(lang, 'welcomeSetPreferences')}

${emailT(lang, 'questionsContact')}

${emailT(lang, 'welcomeTextSignature')} ${appName}

---
${emailT(lang, 'autoEmailFooter')}
    `.trim();
  }

  private getWelcomeTemplate(user: User, branding: EmailBranding, lang: EmailLang): string {
    const templates = {
      escort: this.getEscortWelcomeTemplate(user, branding, lang),
      member: this.getMemberWelcomeTemplate(user, branding, lang),
      agency: this.getAgencyWelcomeTemplate(user, branding, lang),
      club: this.getClubWelcomeTemplate(user, branding, lang),
    };
    return templates[user.userType];
  }

  private getEscortWelcomeTemplate(user: User, branding: EmailBranding, lang: EmailLang): string {
    const name = (user as any).name || user.email;
    const appName = this.escapeHtml(branding.appName);
    const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 22 });
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailT(lang, 'escortWelcomeTitle')} ${name}!</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 30px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 20px 20px 0 0; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="padding: 50px 40px; text-align: center;">
                    ${brandLogo}
                    <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 32px; font-weight: bold;">${emailT(lang, 'escortWelcomeTitle')} ${name}! 💃</h1>
                    <p style="color: #ffffff; margin: 0; font-size: 18px; opacity: 0.95;">${emailT(lang, 'escortProfileReady')}</p>
                  </td>
                </tr>
              </table>
              
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 0 0 20px 20px; overflow: hidden;">
                <!-- Sección principal -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #ffffff; margin: 0 0 15px 0; font-size: 24px; font-weight: bold;">${emailT(lang, 'escortTimeToShine')}</h2>
                    
                    <p style="color: #d1d5db; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                      ${emailT(lang, 'escortAccountCreated')}
                    </p>
                    
                    <!-- Box de Próximos Pasos -->
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 25px; margin: 25px 0; border-radius: 8px;">
                      <p style="color: #f472b6; margin: 0 0 20px 0; font-weight: bold; font-size: 16px;">${emailT(lang, 'escortNextSteps')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; font-size: 15px;">${emailT(lang, 'escortStep1')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; font-size: 15px;">${emailT(lang, 'escortStep2')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; font-size: 15px;">${emailT(lang, 'escortStep3')}</p>
                      <p style="color: #fecdd3; margin: 0; font-size: 15px;">${emailT(lang, 'escortStep4')}</p>
                    </div>
                    
                    <!-- Botón con gradiente -->
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0;">
                          <a href="${config.email.frontendUrl}/admin" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 16px;">
                            ${emailT(lang, 'goToPanel')}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 20px 0 0 0; text-align: center;">
                      ${emailT(lang, 'questionsContact')}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 25px 40px; text-align: center;">
                    <p style="color: #6b7280; font-size: 13px; margin: 0;">
                      ${this.getCopyrightLine(branding, lang)}
                    </p>
                    <p style="color: #999999; font-size: 11px; margin: 10px 0 0 0;">
                      ${emailT(lang, 'autoEmailNotice')}
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

  private getMemberWelcomeTemplate(user: User, branding: EmailBranding, lang: EmailLang): string {
    const username = 'username' in user ? user.username : user.email;
    const appName = this.escapeHtml(branding.appName);
    const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 20 });
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailT(lang, 'memberWelcomeTitle')} @${username}! 🎉</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 8px; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                    ${brandLogo}
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">${emailT(lang, 'memberWelcomeTitle')} @${username}! 🎉</h1>
                    <p style="color: #fce7f3; margin: 0; font-size: 16px;">${emailT(lang, 'memberAccountReady')}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #f472b6; font-size: 24px; margin: 0 0 20px 0;">${emailT(lang, 'memberAllSet')}</h2>
                    
                    <p style="color: #e5e7eb; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      ${emailT(lang, 'memberAccountCreated')}
                    </p>
                    
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="color: #f472b6; margin: 0 0 15px 0; font-weight: bold; font-size: 18px;">${emailT(lang, 'memberFeaturesTitle')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'memberFeature1')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'memberFeature2')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'memberFeature3')}</p>
                      <p style="color: #fecdd3; margin: 0; padding-left: 20px;">${emailT(lang, 'memberFeature4')}</p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0 10px 0;">
                          <a href="${config.email.frontendUrl}" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                            ${emailT(lang, 'explorePlatformButton')}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                      ${emailT(lang, 'needHelp')}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      ${this.getCopyrightLine(branding, lang)}
                    </p>
                    <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                      ${emailT(lang, 'autoEmailNotice')}
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

  private getAgencyWelcomeTemplate(user: User, branding: EmailBranding, lang: EmailLang): string {
    const agencyName = 'agencyName' in user ? user.agencyName : user.email;
    const appName = this.escapeHtml(branding.appName);
    const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 20 });
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailT(lang, 'agencyWelcomeTitle')} ${agencyName}! 🏢</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 8px; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                    ${brandLogo}
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">${emailT(lang, 'agencyWelcomeTitle')} ${agencyName}! 🏢</h1>
                    <p style="color: #fce7f3; margin: 0; font-size: 16px;">${emailT(lang, 'agencyRegistered')}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #f472b6; font-size: 24px; margin: 0 0 20px 0;">${emailT(lang, 'agencyUnderReview')}</h2>
                    
                    <p style="color: #e5e7eb; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      ${emailT(lang, 'agencyAccountCreated')}
                    </p>
                    
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="color: #f472b6; margin: 0 0 15px 0; font-weight: bold; font-size: 18px;">${emailT(lang, 'agencyPanelTitle')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'agencyFeature1')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'agencyFeature2')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'agencyFeature3')}</p>
                      <p style="color: #fecdd3; margin: 0; padding-left: 20px;">${emailT(lang, 'agencyFeature4')}</p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0 10px 0;">
                          <a href="${config.email.frontendUrl}/admin" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                            ${emailT(lang, 'accessPanelButton')}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                      ${emailT(lang, 'needHelp')}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      ${this.getCopyrightLine(branding, lang)}
                    </p>
                    <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                      ${emailT(lang, 'autoEmailNotice')}
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

  private getClubWelcomeTemplate(user: User, branding: EmailBranding, lang: EmailLang): string {
    const clubName = 'clubName' in user ? user.clubName : user.email;
    const appName = this.escapeHtml(branding.appName);
    const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 20 });
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${emailT(lang, 'clubWelcomeTitle')} ${clubName}! 🎪</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 20px;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 8px; overflow: hidden;">
                <!-- Header con gradiente -->
                <tr>
                  <td style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); padding: 40px 20px; text-align: center;">
                    ${brandLogo}
                    <h1 style="color: #ffffff; margin: 0 0 10px 0; font-size: 28px; font-weight: bold;">${emailT(lang, 'clubWelcomeTitle')} ${clubName}! 🎪</h1>
                    <p style="color: #fce7f3; margin: 0; font-size: 16px;">${emailT(lang, 'clubRegistered')}</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #f472b6; font-size: 24px; margin: 0 0 20px 0;">${emailT(lang, 'clubUnderReview')}</h2>
                    
                    <p style="color: #e5e7eb; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                      ${emailT(lang, 'clubAccountCreated')}
                    </p>
                    
                    <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 20px; margin: 25px 0; border-radius: 4px;">
                      <p style="color: #f472b6; margin: 0 0 15px 0; font-weight: bold; font-size: 18px;">${emailT(lang, 'clubPanelTitle')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'clubFeature1')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'clubFeature2')}</p>
                      <p style="color: #fecdd3; margin: 0 0 12px 0; padding-left: 20px;">${emailT(lang, 'clubFeature3')}</p>
                      <p style="color: #fecdd3; margin: 0; padding-left: 20px;">${emailT(lang, 'clubFeature4')}</p>
                    </div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td align="center" style="padding: 30px 0 10px 0;">
                          <a href="${config.email.frontendUrl}/admin" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 14px 35px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold; font-size: 16px;">
                            ${emailT(lang, 'accessPanelButton')}
                          </a>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 30px 0 0 0; text-align: center;">
                      ${emailT(lang, 'needHelp')}
                    </p>
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td style="background-color: #1f2937; padding: 20px 30px; text-align: center;">
                    <p style="color: #6b7280; font-size: 12px; margin: 0;">
                      ${this.getCopyrightLine(branding, lang)}
                    </p>
                    <p style="color: #6b7280; font-size: 11px; margin: 10px 0 0 0;">
                      ${emailT(lang, 'autoEmailNotice')}
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

  /**
   * Send login OTP (2FA) code email
   */
  async sendLoginOtpEmail(toEmail: string, otpCode: string, lang: EmailLang = 'es'): Promise<boolean> {
    if (!this.resend) {
      console.log('❌ OTP Email not sent - Resend not configured');
      return false;
    }

    try {
      const branding = await this.getEmailBranding();
      const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 18 });
      const headerHtml = `
        ${brandLogo}
        <h1 style="color: ${this.emailTheme.textPrimary}; margin: 0; font-size: 28px; font-weight: bold;">${emailT(lang, 'otpTitle')}</h1>
      `;
      const bodyHtml = `
        <div style="text-align: center;">
          <p style="color: ${this.emailTheme.textSecondary}; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
            ${emailT(lang, 'otpBody')}
          </p>
          <div style="background-color: ${this.emailTheme.panelBg}; border: 2px solid #a78bfa; border-radius: 14px; padding: 24px 40px; display: inline-block; margin: 10px 0 20px 0;">
            <span style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #f5d0fe; font-family: 'Courier New', monospace;">${otpCode}</span>
          </div>
          <p style="color: ${this.emailTheme.textMuted}; font-size: 14px; margin: 16px 0 0 0;">
            ${emailT(lang, 'otpExpires')}
          </p>
          <p style="color: ${this.emailTheme.textMuted}; font-size: 13px; margin: 10px 0 0 0;">
            ${emailT(lang, 'otpIgnore')}
          </p>
        </div>
      `;
      const html = this.renderLaunchThemeEmail({
        branding,
        lang,
        title: emailT(lang, 'otpTitle'),
        headerHtml,
        bodyHtml,
        headerPadding: '40px 20px',
        bodyPadding: '40px 30px',
        outerPadding: '20px',
        footerHtml: this.renderEmailFooter(branding, lang, null),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [toEmail],
        subject: `${emailT(lang, 'otpSubject')} ${otpCode} - ${branding.appName}`,
        html,
      });

      if (error) {
        console.error('❌ Failed to send OTP email:', error);
        return false;
      }

      console.log(`✅ OTP email sent to ${toEmail} (ID: ${data?.id})`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      return false;
    }
  }

  /**
   * Send invitation email to a newly created admin account.
   * The setupLink contains the short-lived setup token so the admin
   * can set their password on first login.
   */
  async sendAdminInvitationEmail(email: string, setupLink: string): Promise<boolean> {
    if (!this.resend) {
      console.log('⚠️  Admin invitation not sent - Resend not configured');
      return false;
    }
    try {
      const branding = await this.getEmailBranding();
      const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 150, marginBottom: 18 });
      const safeEmail = this.escapeHtml(email);
      const safeSetupLink = this.escapeHtml(setupLink);
      const headerHtml = `
        ${brandLogo}
        <h1 style="color: ${this.emailTheme.textPrimary}; margin: 0; font-size: 24px; font-weight: 700;">Invitación Administrativa</h1>
        <p style="color: #fce7f3; margin: 8px 0 0 0; font-size: 14px;">Acceso exclusivo para administradores</p>
      `;
      const bodyHtml = `
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0;">
          Se ha creado una cuenta de administrador para <strong style="color: ${this.emailTheme.textPrimary};">${safeEmail}</strong> en ${this.escapeHtml(branding.appName)}.
        </p>
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0;">
          Haz clic en el botón de abajo para crear tu contraseña. Este enlace expira en <strong style="color: #f472b6;">15 minutos</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding: 0 0 28px 0;">
              <a href="${setupLink}" style="background: ${this.emailTheme.headerGradient}; color: ${this.emailTheme.textPrimary}; padding: 14px 36px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">
                Crear mi contraseña
              </a>
            </td>
          </tr>
        </table>

        <div style="background: ${this.emailTheme.panelBg}; border: 1px solid #4b5563; border-radius: 8px; padding: 16px 20px;">
          <p style="color: ${this.emailTheme.textMuted}; font-size: 12px; margin: 0 0 6px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Enlace directo</p>
          <p style="color: #cbd5e1; font-size: 12px; margin: 0; word-break: break-all;">${safeSetupLink}</p>
        </div>

        <p style="color: ${this.emailTheme.textMuted}; font-size: 13px; margin: 24px 0 0 0; line-height: 1.5;">
          Si no esperabas esta invitación, ignora este correo y no hagas clic en el enlace.
        </p>
      `;
      const html = this.renderLaunchThemeEmail({
        branding,
        title: 'Invitación Administrativa',
        width: 560,
        headerHtml,
        bodyHtml,
        headerPadding: '40px 40px 30px 40px',
        bodyPadding: '36px 40px',
        footerHtml: this.renderEmailFooter(branding, 'es', 'Correo automático — no responder'),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [email],
        subject: `🔐 Invitación administrativa - ${branding.appName}`,
        html,
      });

      if (error) { console.error('❌ Admin invitation email failed:', error); return false; }
      console.log(`✅ Admin invitation sent to ${email} (ID: ${data?.id})`);
      return true;
    } catch (err) {
      console.error('❌ Admin invitation email error:', err);
      return false;
    }
  }

  async sendNewUserRegistrationAlert(adminEmail: string, newUser: User): Promise<boolean> {
    if (!this.resend) {
      console.warn('⚠️  New user alert not sent — Resend not configured');
      return false;
    }

    try {
      const branding = await this.getEmailBranding();
      const safeAdminEmail = this.escapeHtml(adminEmail);
      const safeUserName = this.escapeHtml(this.getRegistrationDisplayName(newUser));
      const safeUserEmail = this.escapeHtml(newUser.email);
      const safeUserType = this.escapeHtml(this.getRegistrationUserTypeLabel(newUser.userType));
      const safeTimestamp = this.escapeHtml(
        new Intl.DateTimeFormat('es-ES', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(newUser.createdAt)
      );
      const safeCity = this.escapeHtml('city' in newUser ? newUser.city : 'No especificada');

      const headerHtml = `
        <p style="color: #dbeafe; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px 0;">Notificación administrativa</p>
        <h1 style="color: #eff6ff; margin: 0; font-size: 22px; font-weight: 800;">Nuevo usuario registrado</h1>
        <p style="color: #bfdbfe; font-size: 13px; margin: 8px 0 0 0;">${this.escapeHtml(branding.appName)} · Aviso para administradores</p>
      `;

      const bodyHtml = `
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Se registró un nuevo usuario en la plataforma. Este aviso fue enviado a <strong style="color: ${this.emailTheme.textPrimary};">${safeAdminEmail}</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #4b5563; border-radius: 8px; overflow: hidden;">
          <tr style="background: ${this.emailTheme.panelBg};">
            <td style="padding: 10px 16px; color: #93c5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; width: 38%;">Campo</td>
            <td style="padding: 10px 16px; color: #93c5fd; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Valor</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Nombre</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px; font-weight: 700;">${safeUserName}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563; background: ${this.emailTheme.panelBg};">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Email</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${safeUserEmail}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Tipo de cuenta</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${safeUserType}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563; background: ${this.emailTheme.panelBg};">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Ciudad</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${safeCity}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Fecha de registro</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${safeTimestamp}</td>
          </tr>
        </table>

        <p style="color: ${this.emailTheme.textMuted}; font-size: 13px; margin: 24px 0 0 0; line-height: 1.6;">
          Este correo es informativo y se envía automáticamente cada vez que se registra un usuario nuevo.
        </p>
      `;

      const html = this.renderLaunchThemeEmail({
        branding,
        title: 'Nuevo usuario registrado',
        width: 560,
        headerHtml,
        bodyHtml,
        headerPadding: '28px 36px',
        bodyPadding: '32px 36px',
        headerBackground: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
        footerHtml: this.renderEmailFooter(branding, 'es', 'Notificación automática para administradores'),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [adminEmail],
        subject: `🔔 Nuevo usuario registrado - ${branding.appName}`,
        html,
      });

      if (error) {
        console.error('❌ New user alert email failed:', error);
        return false;
      }

      console.log(`✅ New user alert sent to ${adminEmail} (ID: ${data?.id})`);
      return true;
    } catch (err) {
      console.error('❌ New user alert email error:', err);
      return false;
    }
  }

  /**
   * Send a security alert when a suspicious admin-login attempt is detected.
   * Called when an email is not found or is not an ADMIN.
   */
  async sendSuspiciousLoginAlert(
    alertEmail: string,
    details: {
      attemptedEmail: string;
      ip: string;
      userAgent: string;
      origin: string;
      timestamp: string;
    },
  ): Promise<boolean> {
    if (!this.resend || !alertEmail) {
      console.warn('⚠️  Security alert not sent — Resend not configured or no alert email set');
      return false;
    }
    try {
      const branding = await this.getEmailBranding();
      const safeAttemptedEmail = this.escapeHtml(details.attemptedEmail);
      const safeIp = this.escapeHtml(details.ip);
      const safeTimestamp = this.escapeHtml(details.timestamp);
      const safeOrigin = this.escapeHtml(details.origin);
      const safeUserAgent = this.escapeHtml(details.userAgent);
      const headerHtml = `
        <p style="color: #fecaca; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px 0;">⚠ Alerta de Seguridad</p>
        <h1 style="color: #fef2f2; margin: 0; font-size: 22px; font-weight: 800;">Intento de acceso sospechoso</h1>
        <p style="color: #fca5a5; font-size: 13px; margin: 8px 0 0 0;">Panel de Administración · ${this.escapeHtml(branding.appName)}</p>
      `;
      const bodyHtml = `
        <p style="color: ${this.emailTheme.textSecondary}; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Se detectó un intento de inicio de sesión en el panel administrativo con un email que <strong style="color: #f87171;">no corresponde a ningún administrador registrado</strong>.
        </p>

        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #4b5563; border-radius: 8px; overflow: hidden;">
          <tr style="background: ${this.emailTheme.panelBg};">
            <td style="padding: 10px 16px; color: ${this.emailTheme.textMuted}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; width: 38%;">Campo</td>
            <td style="padding: 10px 16px; color: ${this.emailTheme.textMuted}; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Valor</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Email intentado</td>
            <td style="padding: 12px 16px; color: #f87171; font-size: 13px; font-weight: 600;">${safeAttemptedEmail}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563; background: ${this.emailTheme.panelBg};">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Dirección IP</td>
            <td style="padding: 12px 16px; color: #e2e8f0; font-size: 13px; font-family: monospace;">${safeIp}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Fecha y hora</td>
            <td style="padding: 12px 16px; color: #e2e8f0; font-size: 13px;">${safeTimestamp}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563; background: ${this.emailTheme.panelBg};">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">Origen</td>
            <td style="padding: 12px 16px; color: #e2e8f0; font-size: 13px;">${safeOrigin}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 13px; font-weight: 600;">User-Agent</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textMuted}; font-size: 12px; word-break: break-all;">${safeUserAgent}</td>
          </tr>
        </table>

        <div style="background: #450a0a; border: 1px solid #7f1d1d; border-radius: 8px; padding: 16px 20px; margin-top: 24px;">
          <p style="color: #fca5a5; font-size: 13px; margin: 0; line-height: 1.6;">
            <strong>Acción recomendada:</strong> Si reconoces esta actividad, puedes ignorar esta alerta. Si no, revisa el acceso a tu panel y considera cambiar las credenciales de tus administradores.
          </p>
        </div>
      `;
      const html = this.renderLaunchThemeEmail({
        branding,
        title: 'Alerta de Seguridad',
        width: 560,
        headerHtml,
        bodyHtml,
        headerPadding: '28px 36px',
        bodyPadding: '32px 36px',
        headerBackground: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
        footerHtml: this.renderEmailFooter(branding, 'es', 'Alerta automática de seguridad'),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [alertEmail],
        subject: `🚨 Alerta de seguridad - ${branding.appName}`,
        html,
      });

      if (error) { console.error('❌ Security alert email failed:', error); return false; }
      console.log(`✅ Security alert sent to ${alertEmail} (ID: ${data?.id})`);
      return true;
    } catch (err) {
      console.error('❌ Security alert email error:', err);
      return false;
    }
  }

  async sendServiceSuggestionAlert(
    alertEmail: string,
    details: {
      userId: string;
      userEmail: string;
      profileName?: string;
      advertisementTitle?: string;
      selectedServices: string[];
      selectedServiceCategories: string[];
      message: string;
      timestamp: string;
    },
  ): Promise<boolean> {
    if (!this.resend || !alertEmail) {
      console.warn('⚠️  Service suggestion alert not sent — Resend not configured or no alert email set');
      return false;
    }

    try {
      const branding = await this.getEmailBranding();
      const safeProfileName = this.escapeHtml(details.profileName || 'Unknown');
      const safeAdvertisementTitle = this.escapeHtml(details.advertisementTitle || 'Not provided');
      const safeUserEmail = this.escapeHtml(details.userEmail);
      const safeUserId = this.escapeHtml(details.userId);
      const safeMessage = this.escapeHtml(details.message).replace(/\n/g, '<br />');
      const categoryItems = details.selectedServiceCategories.length > 0
        ? details.selectedServiceCategories
            .map((item) => `<li style="margin:0 0 6px 0;">${this.escapeHtml(item)}</li>`)
            .join('')
        : '<li style="margin:0;">No categories selected</li>';
      const serviceItems = details.selectedServices.length > 0
        ? details.selectedServices
            .map((item) => `<li style="margin:0 0 6px 0;">${this.escapeHtml(item)}</li>`)
            .join('')
        : '<li style="margin:0;">No detailed services selected</li>';
      const headerHtml = `
        <p style="color: #ffedd5; font-size: 12px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px 0;">Service suggestion inbox</p>
        <h1 style="color: #fff7ed; margin: 0; font-size: 22px; font-weight: 800;">New missing-service suggestion</h1>
        <p style="color: #fdba74; font-size: 13px; margin: 8px 0 0 0;">${this.escapeHtml(branding.appName)} · Submitted from the model management panel</p>
      `;
      const bodyHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #4b5563; border-radius: 8px; overflow: hidden;">
          <tr style="background: ${this.emailTheme.panelBg};">
            <td style="padding: 10px 16px; color: #fdba74; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; width: 38%;">Field</td>
            <td style="padding: 10px 16px; color: #fdba74; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Value</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: #fdba74; font-size: 13px; font-weight: 600;">Profile name</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${safeProfileName}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563; background: ${this.emailTheme.panelBg};">
            <td style="padding: 12px 16px; color: #fdba74; font-size: 13px; font-weight: 600;">Advertisement title</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${safeAdvertisementTitle}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: #fdba74; font-size: 13px; font-weight: 600;">User email</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${safeUserEmail}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563; background: ${this.emailTheme.panelBg};">
            <td style="padding: 12px 16px; color: #fdba74; font-size: 13px; font-weight: 600;">User ID</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px; font-family: monospace;">${safeUserId}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 12px 16px; color: #fdba74; font-size: 13px; font-weight: 600;">Timestamp</td>
            <td style="padding: 12px 16px; color: ${this.emailTheme.textPrimary}; font-size: 13px;">${this.escapeHtml(details.timestamp)}</td>
          </tr>
        </table>

        <div style="margin-top: 24px;">
          <p style="margin: 0 0 10px 0; color: #fdba74; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Suggested service</p>
          <div style="background: ${this.emailTheme.panelBg}; border: 1px solid #9a3412; border-radius: 8px; padding: 16px; color: #ffedd5; font-size: 14px; line-height: 1.7;">
            ${safeMessage}
          </div>
        </div>

        <div style="margin-top: 24px;">
          <p style="margin: 0 0 10px 0; color: #fdba74; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Selected service categories</p>
          <ul style="margin: 0; padding-left: 20px; color: ${this.emailTheme.textSecondary}; font-size: 13px; line-height: 1.7;">
            ${categoryItems}
          </ul>
        </div>

        <div style="margin-top: 20px;">
          <p style="margin: 0 0 10px 0; color: #fdba74; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">Selected detailed services</p>
          <ul style="margin: 0; padding-left: 20px; color: ${this.emailTheme.textSecondary}; font-size: 13px; line-height: 1.7;">
            ${serviceItems}
          </ul>
        </div>
      `;
      const html = this.renderLaunchThemeEmail({
        branding,
        title: 'Service suggestion inbox',
        width: 620,
        headerHtml,
        bodyHtml,
        headerPadding: '28px 36px',
        bodyPadding: '32px 36px',
        headerBackground: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)',
        footerHtml: this.renderEmailFooter(branding, 'es', null),
      });

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [alertEmail],
        subject: `📬 Sugerencia de servicio - ${branding.appName} - ${details.profileName || details.userEmail}`,
        html,
      });

      if (error) {
        console.error('❌ Service suggestion email failed:', error);
        return false;
      }

      console.log(`✅ Service suggestion sent to ${alertEmail} (ID: ${data?.id})`);
      return true;
    } catch (err) {
      console.error('❌ Service suggestion email error:', err);
      return false;
    }
  }

  /**
   * Send verification status notification email (VERIFIED or REJECTED)
   */
  async sendVerificationStatusEmail(
    toEmail: string,
    adName: string,
    status: 'VERIFIED' | 'REJECTED',
    comment?: string,
    lang: EmailLang = 'es',
  ): Promise<boolean> {
    if (!this.resend) {
      console.log('❌ Email not sent - Resend not configured');
      return false;
    }

    const branding = await this.getEmailBranding();
    const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 160, marginBottom: 18 });

    const isVerified = status === 'VERIFIED';
    const subject = isVerified
      ? `✅ ${emailT(lang, 'verifiedSubject').replace('{adName}', adName)} - ${branding.appName}`
      : `❌ ${emailT(lang, 'rejectedSubject').replace('{adName}', adName)} - ${branding.appName}`;

    const statusColor = isVerified ? '#4ade80' : '#f87171';
    const statusBg = isVerified ? '#052e16' : '#450a0a';
    const statusLabel = isVerified ? emailT(lang, 'statusVerified') : emailT(lang, 'statusRejected');
    const statusIcon = isVerified ? '✅' : '❌';
    const headingText = subject.replace(/^[✅❌] /, '');
    const safeHeading = this.escapeHtml(headingText);
    const safeComment = comment ? this.escapeHtml(comment) : '';

    const commentBlock = !isVerified && comment
      ? `
        <div style="background-color: #3f2a14; border-left: 4px solid #f97316; border-radius: 8px; padding: 16px 20px; margin: 28px 0 0 0; text-align: left;">
          <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 700; color: #fdba74; text-transform: uppercase; letter-spacing: 0.05em;">
            ${emailT(lang, 'rejectionReason')}
          </p>
          <p style="margin: 0; font-size: 15px; color: #fed7aa; line-height: 1.6;">${safeComment}</p>
        </div>`
      : '';
    const headerHtml = `
      ${brandLogo}
      <p style="color: rgba(255, 255, 255, 0.75); margin: 6px 0 0 0; font-size: 13px;">${emailT(lang, 'verificationPanel')}</p>
    `;
    const bodyHtml = `
      <div style="text-align: center;">
        <div style="display: inline-block; background-color: ${statusBg}; border: 1.5px solid ${statusColor}; border-radius: 999px; padding: 8px 22px; margin-bottom: 20px;">
          <span style="color: ${statusColor}; font-size: 14px; font-weight: 700; letter-spacing: 0.08em;">${statusIcon} ${statusLabel}</span>
        </div>
        <h2 style="margin: 0 0 10px 0; font-size: 20px; color: ${this.emailTheme.textPrimary};">${safeHeading}</h2>
        <p style="margin: 0; font-size: 15px; color: ${this.emailTheme.textSecondary}; line-height: 1.6;">
          ${isVerified ? emailT(lang, 'verifiedBody') : emailT(lang, 'rejectedBody')}
        </p>
        ${commentBlock}
        <p style="margin: 28px 0 0 0; font-size: 13px; color: ${this.emailTheme.textMuted};">
          ${emailT(lang, 'verificationContactSupport')}
        </p>
      </div>
    `;
    const html = this.renderLaunchThemeEmail({
      branding,
      lang,
      title: headingText,
      headerHtml,
      bodyHtml,
      headerPadding: '40px 20px',
      bodyPadding: '36px 30px',
      outerPadding: '20px',
    });

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [toEmail],
        subject,
        html,
      });

      if (error) {
        console.error('❌ Verification status email failed:', error);
        return false;
      }
      console.log(`✅ Verification status email sent to ${toEmail} (ID: ${data?.id})`);
      return true;
    } catch (err) {
      console.error('❌ Verification status email error:', err);
      return false;
    }
  }

  /**
   * Send launch credits email to newly registered escorts
   */
  async sendLaunchCreditsEmail(user: User, credits: number = 100): Promise<boolean> {
    if (!this.resend) {
      console.log('❌ Email not sent - Resend not configured');
      return false;
    }

    try {
      const branding = await this.getEmailBranding();
      const lang = resolveEmailLang((user as any).preferredLanguage);
      const name = (user as any).name || user.email;
      const appName = this.escapeHtml(branding.appName);
      const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 170, marginBottom: 22 });

      const subject = `🎁 ${emailT(lang, 'launchCreditsSubject').replace('{name}', name).replace('{credits}', String(credits)).replace('{appName}', branding.appName)}`;

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${emailT(lang, 'launchCreditsTitle').replace('{credits}', String(credits))}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #1f2937;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1f2937; padding: 30px 0;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border-radius: 20px 20px 0 0; overflow: hidden;">
                  <!-- Header con gradiente -->
                  <tr>
                    <td style="padding: 50px 40px; text-align: center;">
                      ${brandLogo}
                      <h1 style="color: #ffffff; margin: 0 0 15px 0; font-size: 32px; font-weight: bold;">${emailT(lang, 'launchCreditsTitle').replace('{credits}', String(credits))}</h1>
                      <p style="color: #ffffff; margin: 0; font-size: 18px; opacity: 0.95;">${emailT(lang, 'launchCreditsSubtitle').replace('{appName}', appName)}</p>
                    </td>
                  </tr>
                </table>

                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #2d3748; border-radius: 0 0 20px 20px; overflow: hidden;">
                  <!-- Sección principal -->
                  <tr>
                    <td style="padding: 40px;">
                      <p style="color: #d1d5db; font-size: 16px; line-height: 24px; margin: 0 0 30px 0;">
                        ${emailT(lang, 'launchCreditsGreeting').replace('{name}', this.escapeHtml(name)).replace('{credits}', String(credits))}
                      </p>

                      <!-- Box de Saldo -->
                      <div style="background-color: #374151; border-left: 4px solid #ec4899; padding: 25px; margin: 25px 0; border-radius: 8px; text-align: center;">
                        <p style="color: #f472b6; margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">${emailT(lang, 'launchCreditsBalance')}</p>
                        <p style="color: #ffffff; margin: 0 0 8px 0; font-size: 36px; font-weight: bold;">${credits} ${emailT(lang, 'launchCreditsUnit')}</p>
                        <p style="color: #9ca3af; margin: 0; font-size: 13px;">${emailT(lang, 'launchCreditsAdded')}</p>
                      </div>

                      <!-- Box de Qué puedes hacer -->
                      <div style="background-color: #374151; border-left: 4px solid #8b5cf6; padding: 25px; margin: 25px 0; border-radius: 8px;">
                        <p style="color: #a78bfa; margin: 0 0 20px 0; font-weight: bold; font-size: 16px;">${emailT(lang, 'launchCreditsWhatToDo')}</p>
                        <p style="color: #d1d5db; margin: 0 0 12px 0; font-size: 15px;">${emailT(lang, 'launchCreditsFeature1')}</p>
                        <p style="color: #d1d5db; margin: 0 0 12px 0; font-size: 15px;">${emailT(lang, 'launchCreditsFeature2')}</p>
                        <p style="color: #d1d5db; margin: 0; font-size: 15px;">${emailT(lang, 'launchCreditsFeature3')}</p>
                      </div>

                      <!-- Botón con gradiente -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 30px 0;">
                            <a href="${config.email.frontendUrl}/admin" style="background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 10px; display: inline-block; font-weight: bold; font-size: 16px;">
                              ${emailT(lang, 'launchCreditsButton')}
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #9ca3af; font-size: 14px; line-height: 20px; margin: 20px 0 0 0; text-align: center;">
                        ${emailT(lang, 'launchCreditsLimited')}
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #1f2937; padding: 25px 40px; text-align: center;">
                      <p style="color: #6b7280; font-size: 13px; margin: 0;">
                        ${this.getCopyrightLine(branding, lang)}
                      </p>
                      <p style="color: #999999; font-size: 11px; margin: 10px 0 0 0;">
                        ${emailT(lang, 'autoEmailNotice')}
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

      const text = `
${emailT(lang, 'launchCreditsGreeting').replace('{name}', name).replace('{credits}', String(credits)).replace(/<[^>]+>/g, '')}

${emailT(lang, 'launchCreditsTitle').replace('{credits}', String(credits))}

${emailT(lang, 'launchCreditsFeature1').replace(/<[^>]+>/g, '')}
${emailT(lang, 'launchCreditsFeature2').replace(/<[^>]+>/g, '')}
${emailT(lang, 'launchCreditsFeature3').replace(/<[^>]+>/g, '')}

${emailT(lang, 'launchCreditsButton')}: ${config.email.frontendUrl}/admin

${emailT(lang, 'launchCreditsLimited')}

${branding.appName}
      `.trim();

      console.log(`📧 Sending launch credits email to ${user.email}...`);

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [user.email],
        subject,
        html,
        text,
      });

      if (error) {
        console.error('❌ Failed to send launch credits email:', error);
        return false;
      }

      console.log(`✅ Launch credits email sent successfully to ${user.email} (ID: ${data?.id})`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send launch credits email:', error.message);
      return false;
    }
  }

  /**
   * Send a contact form submission to the admin email
   */
  async sendContactFormEmail(
    senderEmail: string,
    topic: string,
    message: string,
  ): Promise<boolean> {
    if (!this.resend) {
      console.log('❌ Contact email not sent - Resend not configured');
      return false;
    }

    try {
      const branding = await this.getEmailBranding();
      const safeSender = this.escapeHtml(senderEmail);
      const safeTopic = this.escapeHtml(topic);
      const safeMessage = this.escapeHtml(message).replace(/\n/g, '<br>');
      const brandLogo = this.renderBrandLogo(branding, { dark: true, maxWidth: 150, marginBottom: 18 });
      const headerHtml = `
        ${brandLogo}
        <h1 style="color: ${this.emailTheme.textPrimary}; margin: 0; font-size: 24px; font-weight: 700;">New Contact Form Submission</h1>
        <p style="color: #fce7f3; margin: 8px 0 0 0; font-size: 14px;">${this.escapeHtml(branding.appName)} contact inbox</p>
      `;
      const bodyHtml = `
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; margin: 0 0 16px 0; border: 1px solid #4b5563; border-radius: 8px; overflow: hidden;">
          <tr style="background: ${this.emailTheme.panelBg};">
            <td style="padding: 10px 12px; border-right: 1px solid #4b5563; color: #f9a8d4; font-weight: 600; width: 120px;">From</td>
            <td style="padding: 10px 12px; color: ${this.emailTheme.textPrimary};">${safeSender}</td>
          </tr>
          <tr style="border-top: 1px solid #4b5563;">
            <td style="padding: 10px 12px; border-right: 1px solid #4b5563; color: #f9a8d4; font-weight: 600;">Topic</td>
            <td style="padding: 10px 12px; color: ${this.emailTheme.textPrimary};">${safeTopic}</td>
          </tr>
        </table>
        <div style="padding: 16px; border: 1px solid #4b5563; border-radius: 8px; background: ${this.emailTheme.panelBg}; margin-top: 12px;">
          <p style="margin: 0 0 8px 0; font-weight: 600; color: #f9a8d4;">Message:</p>
          <p style="margin: 0; color: ${this.emailTheme.textSecondary}; line-height: 1.6;">${safeMessage}</p>
        </div>
      `;
      const html = this.renderLaunchThemeEmail({
        branding,
        title: 'New Contact Form Submission',
        headerHtml,
        bodyHtml,
        headerPadding: '40px 20px',
        bodyPadding: '32px 30px',
        outerPadding: '20px',
        footerHtml: this.renderEmailFooter(branding, 'es', 'Formulario de contacto'),
      });

      const text = `New Contact Form\nFrom: ${senderEmail}\nTopic: ${topic}\n\nMessage:\n${message}`;

      console.log(`📧 Sending contact form email from ${senderEmail}...`);

      const { data, error } = await this.resend.emails.send({
        from: this.getFromAddress(branding),
        to: [config.email.fromEmail],
        replyTo: senderEmail,
        subject: `[Contact] ${topic}`,
        html,
        text,
      });

      if (error) {
        console.error('❌ Failed to send contact form email:', error);
        return false;
      }

      console.log(`✅ Contact form email sent (ID: ${data?.id})`);
      return true;
    } catch (error: any) {
      console.error('❌ Failed to send contact form email:', error.message);
      return false;
    }
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
