import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabaseService } from "../services/database.service";
import { getAppDatabaseService } from "../services/app-database.service";
import { BadRequestError, NotFoundError } from "../models/error.model";
import { getEmailService } from "../services/email.service";
import { generateSetupToken } from "../utils/jwt.utils";
import { getCloudinaryService } from "../services/cloudinary.service";
import { resolveEmailLang } from "../utils/email-translations";
import { config } from "../config";
import type { PromotionPlanAvailabilityStatus } from "../models/advertisement.model";

const db = getDatabaseService();
const appDb = getAppDatabaseService();

const REGISTRATION_SETTING_KEYS = {
  escortRegistrationEnabled: "registration_escort_enabled",
  memberRegistrationEnabled: "registration_member_enabled",
  agencyRegistrationEnabled: "registration_agency_enabled",
  clubRegistrationEnabled: "registration_club_enabled",
} as const;

const PUBLIC_MENU_SETTING_KEYS = {
  homeMenuEnabled: "menu_home_enabled",
  womenMenuEnabled: "menu_women_enabled",
  menMenuEnabled: "menu_men_enabled",
  couplesMenuEnabled: "menu_couples_enabled",
  transMenuEnabled: "menu_trans_enabled",
  companionsMenuEnabled: "menu_companions_enabled",
  videosMenuEnabled: "menu_videos_enabled",
} as const;

const DASHBOARD_MENU_SETTING_KEYS = {
  dashboardMenuPhotosEnabled: "dashboard_menu_photos_enabled",
  dashboardMenuReviewsEnabled: "dashboard_menu_reviews_enabled",
  dashboardMenuVideosEnabled: "dashboard_menu_videos_enabled",
  dashboardMenuAvailablePromotionsEnabled: "dashboard_menu_available_promotions_enabled",
  dashboardMenuBoostEnabled: "dashboard_menu_boost_enabled",
  dashboardMenuBuyCreditsEnabled: "dashboard_menu_buy_credits_enabled",
  dashboardMenuVideoPromotionEnabled: "dashboard_menu_video_promotion_enabled",
  dashboardMenuMessagesEnabled: "dashboard_menu_messages_enabled",
  dashboardMenuNotificationsEnabled: "dashboard_menu_notifications_enabled",
  dashboardMenuSavedSearchEnabled: "dashboard_menu_saved_search_enabled",
  dashboardMenuInvoiceEnabled: "dashboard_menu_invoice_enabled",
  dashboardMenuBalanceEnabled: "dashboard_menu_balance_enabled",
} as const;

const PHOTO_SETTING_KEYS = {
  photoVerificationRequired: "photo_verification_required",
} as const;

const LAUNCH_SETTING_KEYS = {
  launchCreditsEmailEnabled: "launch_credits_email_enabled",
  promotionDurationSelectorEnabled: "promotion_duration_selector_enabled",
} as const;

const ADVERTISEMENT_SETTING_KEYS = {
  advertisementPromoStickerEnabled: "advertisement_promo_sticker_enabled",
} as const;

function parseBooleanAdminSetting(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value === null || value.trim() === "") {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["false", "0", "no", "off"].includes(normalized)) {
    return false;
  }
  if (["true", "1", "yes", "on"].includes(normalized)) {
    return true;
  }

  return defaultValue;
}

function parseBooleanAdminInput(
  value: unknown,
  fieldName: string,
): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  throw new BadRequestError(`${fieldName} must be a boolean`);
}

/**
 * GET /api/admin/users
 * Returns a paginated list of users for admin review.
 */
export async function listUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const supabase = (db as any).client;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const search = (req.query.search as string)?.trim() || "";

    let query = supabase
      .from("users")
      .select(
        "id, email, user_type, role, is_active, email_verified, created_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike("email", `%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      success: true,
      data: {
        data: data.map((u: any) => ({
          id: u.id,
          email: u.email,
          userType: u.user_type,
          role: u.role ?? "USER",
          isActive: u.is_active,
          emailVerified: u.email_verified,
          createdAt: u.created_at,
        })),
        meta: { total: count ?? 0, page, limit },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Promote or demote a user. Allowed values: USER | ADMIN
 */
export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (role !== "USER" && role !== "ADMIN") {
      throw new BadRequestError("role must be 'USER' or 'ADMIN'");
    }

    // Prevent admins from demoting themselves
    const requestingUserId = (req as any).user?.userId;
    if (role === "USER" && id === requestingUserId) {
      throw new BadRequestError(
        "No puedes quitarte el rol de ADMIN a ti mismo",
      );
    }

    const supabase = (db as any).client;
    const { data, error } = await supabase
      .from("users")
      .update({ role })
      .eq("id", id)
      .select("id, email, user_type, role")
      .single();

    if (error || !data) throw new NotFoundError("Usuario no encontrado");

    res.json({
      data: {
        id: data.id,
        email: data.email,
        userType: data.user_type,
        role: data.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/promotion-plans
 * Admin view of all plans (including inactive).
 */
export async function getAdminPromotionPlans(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const plans = await appDb.getPromotionPlans({ includeHidden: true });
    res.json({ data: plans });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/promotion-plans/:id
 * Update any plan field as admin (same logic as promotion-plan controller but scoped here for clarity).
 */
export async function updateAdminPromotionPlan(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const {
      pricePerDay,
      pricePerWeek,
      pricePerMonth,
      displayName,
      features,
      isActive,
      availabilityStatus,
      expiresAt,
    } =
      req.body;

    let parsedExpiresAt: Date | null | undefined = undefined;
    if (expiresAt !== undefined) {
      if (expiresAt === null || expiresAt === "") {
        parsedExpiresAt = null;
      } else {
        parsedExpiresAt = new Date(String(expiresAt));
        if (Number.isNaN(parsedExpiresAt.getTime())) {
          throw new BadRequestError("expiresAt must be a valid date");
        }
      }
    }

    const plan = await appDb.updatePromotionPlan(id, {
      pricePerDay: pricePerDay !== undefined ? Number(pricePerDay) : undefined,
      pricePerWeek:
        pricePerWeek !== undefined ? Number(pricePerWeek) : undefined,
      pricePerMonth:
        pricePerMonth !== undefined ? Number(pricePerMonth) : undefined,
      displayName: displayName !== undefined ? String(displayName) : undefined,
      features: features ?? undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      expiresAt: parsedExpiresAt,
      availabilityStatus:
        availabilityStatus !== undefined
          ? (String(availabilityStatus) as PromotionPlanAvailabilityStatus)
          : undefined,
    });

    res.json({ data: plan });
  } catch (err) {
    next(err);
  }
}

// ─── Verifications ────────────────────────────────────────────────────────────

const VALID_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "VERIFIED",
  "REJECTED",
] as const;
type VerificationStatus = (typeof VALID_STATUSES)[number];

/**
 * GET /api/admin/verifications
 * Lists ads that have at least one verification photo (status filter optional).
 * Query: status (PENDING|SUBMITTED|VERIFIED|REJECTED|ALL), page, limit
 */
export async function listVerifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const supabase = (db as any).client;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 20);
    const offset = (page - 1) * limit;
    const statusFilter =
      (req.query.status as string)?.toUpperCase() || "SUBMITTED";

    let query = supabase
      .from("advertisements")
      .select(
        "id, name, user_id, verification_status, verification_photo_presence, verification_photo_body, verification_photo_identity, created_at, updated_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (statusFilter !== "ALL") {
      query = query.eq("verification_status", statusFilter);
    } else {
      // Only show ads that were ever submitted (have at least one photo)
      query = query.not("verification_photo_presence", "is", null);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    const items = (data ?? []).map((row: any) => ({
      id: row.id,
      name: row.name,
      userId: row.user_id,
      verificationStatus: row.verification_status ?? "PENDING",
      hasPresencePhoto: !!row.verification_photo_presence,
      hasBodyPhoto: !!row.verification_photo_body,
      hasIdentityPhoto: !!row.verification_photo_identity,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      data: {
        data: items,
        meta: { total: count ?? 0, page, limit },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/verifications/:adId
 * Returns the full verification detail including photo URLs.
 */
export async function getVerificationDetail(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { adId } = req.params;
    const supabase = (db as any).client;

    const { data, error } = await supabase
      .from("advertisements")
      .select(
        "id, name, user_id, verification_status, verification_photo_presence, verification_photo_body, verification_photo_identity, created_at, updated_at",
      )
      .eq("id", adId)
      .single();

    if (error || !data) throw new NotFoundError("Anuncio no encontrado");

    res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        userId: data.user_id,
        verificationStatus: data.verification_status ?? "PENDING",
        verificationPhotoPresence: data.verification_photo_presence ?? null,
        verificationPhotoBody: data.verification_photo_body ?? null,
        verificationPhotoIdentity: data.verification_photo_identity ?? null,
        updatedAt: data.updated_at,
        createdAt: data.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/verifications/:adId
 * Updates verification_status for an advertisement.
 * Body: { status: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED', comment?: string }
 * comment is required when status === 'REJECTED'
 */
export async function updateVerificationStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { adId } = req.params;
    const { status, comment } = req.body as { status: VerificationStatus; comment?: string };

    if (!VALID_STATUSES.includes(status)) {
      throw new BadRequestError(
        `status debe ser uno de: ${VALID_STATUSES.join(", ")}`,
      );
    }

    if (status === "REJECTED" && (!comment || !comment.trim())) {
      throw new BadRequestError("El comentario es obligatorio al rechazar una verificación");
    }

    const supabase = (db as any).client;

    // Fetch ad + user email in one join
    const { data: adData, error: adError } = await supabase
      .from("advertisements")
      .select("id, name, user_id, users!inner(email, preferred_language)")
      .eq("id", adId)
      .single();

    if (adError || !adData) throw new NotFoundError("Anuncio no encontrado");

    const { data, error } = await supabase
      .from("advertisements")
      .update({
        verification_status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", adId)
      .select("id, name, verification_status")
      .single();

    if (error || !data) throw new NotFoundError("Anuncio no encontrado");

    // Send email notification for VERIFIED and REJECTED
    if (status === "VERIFIED" || status === "REJECTED") {
      const userEmail = (adData.users as any)?.email;
      if (userEmail) {
        const emailService = getEmailService();
        const userLang = resolveEmailLang((adData.users as any)?.preferred_language);
        emailService
          .sendVerificationStatusEmail(userEmail, adData.name, status, comment?.trim(), userLang)
          .catch((e) => console.error("❌ Failed to send verification email:", e));
      }
    }

    res.json({
      success: true,
      data: {
        id: data.id,
        name: data.name,
        verificationStatus: data.verification_status,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/create-admin
 * Creates a new user with role=ADMIN. No password is required — an invitation
 * email is sent with a one-time setup link so the admin can create their password.
 */
export async function createAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { email, name } = req.body;

    if (!email || !name) {
      throw new BadRequestError("email y name son requeridos");
    }

    const normalizedEmail = (email as string).toLowerCase().trim();

    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(normalizedEmail)) {
      throw new BadRequestError("Email inválido");
    }

    const supabase = (getDatabaseService() as any).client;

    // Check for duplicate email
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existing) {
      throw new BadRequestError("Ya existe un usuario con ese email");
    }

    const newId = uuidv4();
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("users")
      .insert({
        id: newId,
        email: normalizedEmail,
        password: "", // No password until setup link is used
        user_type: 'member', // least-restrictive type; role=ADMIN overrides meaning
        role: 'ADMIN',
        name: (name as string).trim(),
        username: (name as string).trim().toLowerCase().replace(/\s+/g, '_'),
        city: 'N/A',
        is_active: true,
        email_verified: true,
        force_password_change: true,
        token_version: 0,
        created_at: now,
        updated_at: now,
      })
      .select(
        "id, email, user_type, role, is_active, email_verified, created_at",
      )
      .single();

    if (error || !data)
      throw new BadRequestError(
        error?.message ?? "Error al crear el administrador",
      );

    // Send invitation email with one-time setup link
    const setupToken = generateSetupToken(newId, normalizedEmail);
    // Prefer the configured FRONTEND_URL; fall back to the Origin header of the
    // current request so the link works even when the env var is not set on Render.
    const configuredUrl = (config as any).email?.frontendUrl ?? process.env.FRONTEND_URL ?? '';
    const isLocalhost = !configuredUrl || configuredUrl.includes('localhost') || configuredUrl.includes('127.0.0.1');
    const requestOrigin = req.headers.origin || req.headers.referer?.replace(/\/$/, '').split('/').slice(0, 3).join('/');
    const frontendUrl = (isLocalhost && requestOrigin) ? requestOrigin : (configuredUrl || 'http://localhost:3000');
    const setupLink = `${frontendUrl}/admin-login?setup=${setupToken}`;
    await getEmailService().sendAdminInvitationEmail(
      normalizedEmail,
      setupLink,
    );

    res.status(201).json({
      data: {
        id: data.id,
        email: data.email,
        userType: data.user_type,
        role: data.role,
        isActive: data.is_active,
        emailVerified: data.email_verified,
        createdAt: data.created_at,
        invitationSent: true,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/settings
 * Returns admin panel settings (e.g. security_alert_email).
 */
export async function getAdminSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const supabase = (getDatabaseService() as any).client;
    const { data, error } = await supabase
      .from("admin_settings")
      .select("key, value");

    if (error) throw error;

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }

    res.json({
      data: {
        securityAlertEmail: settings["security_alert_email"] ?? "",
        appName: settings["app_name"] ?? "",
        appLogoUrl: settings["app_logo_url"] ?? "",
        appLogoDarkUrl: settings["app_logo_dark_url"] ?? "",
        appEmailLogoUrl: settings["app_email_logo_url"] ?? "",
        appFaviconUrl: settings["app_favicon_url"] ?? "",
        themeColorFrom: settings["theme_color_from"] ?? "",
        themeColorTo: settings["theme_color_to"] ?? "",
        topbarBgImage: settings["topbar_bg_image"] ?? "",
        escortRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.escortRegistrationEnabled],
          true,
        ),
        memberRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.memberRegistrationEnabled],
          true,
        ),
        agencyRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.agencyRegistrationEnabled],
          true,
        ),
        clubRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.clubRegistrationEnabled],
          true,
        ),
        homeMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.homeMenuEnabled],
          true,
        ),
        womenMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.womenMenuEnabled],
          true,
        ),
        menMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.menMenuEnabled],
          true,
        ),
        couplesMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.couplesMenuEnabled],
          true,
        ),
        transMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.transMenuEnabled],
          true,
        ),
        companionsMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.companionsMenuEnabled],
          true,
        ),
        videosMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.videosMenuEnabled],
          true,
        ),
        photoVerificationRequired: parseBooleanAdminSetting(
          settings[PHOTO_SETTING_KEYS.photoVerificationRequired],
          true,
        ),
        // Dashboard menu settings
        dashboardMenuPhotosEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuPhotosEnabled],
          true,
        ),
        dashboardMenuReviewsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuReviewsEnabled],
          true,
        ),
        dashboardMenuVideosEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuVideosEnabled],
          true,
        ),
        dashboardMenuAvailablePromotionsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuAvailablePromotionsEnabled],
          true,
        ),
        dashboardMenuBoostEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuBoostEnabled],
          true,
        ),
        dashboardMenuBuyCreditsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuBuyCreditsEnabled],
          true,
        ),
        dashboardMenuVideoPromotionEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuVideoPromotionEnabled],
          true,
        ),
        dashboardMenuMessagesEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuMessagesEnabled],
          true,
        ),
        dashboardMenuNotificationsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuNotificationsEnabled],
          true,
        ),
        dashboardMenuSavedSearchEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuSavedSearchEnabled],
          true,
        ),
        dashboardMenuInvoiceEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuInvoiceEnabled],
          true,
        ),
        dashboardMenuBalanceEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuBalanceEnabled],
          true,
        ),
        // Launch settings
        launchCreditsEmailEnabled: parseBooleanAdminSetting(
          settings[LAUNCH_SETTING_KEYS.launchCreditsEmailEnabled],
          true,
        ),
        promotionDurationSelectorEnabled: parseBooleanAdminSetting(
          settings[LAUNCH_SETTING_KEYS.promotionDurationSelectorEnabled],
          true,
        ),
        // Advertisement feature settings
        advertisementPromoStickerEnabled: parseBooleanAdminSetting(
          settings[ADVERTISEMENT_SETTING_KEYS.advertisementPromoStickerEnabled],
          true,
        ),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/settings
 * Updates admin panel settings.
 */
export async function updateAdminSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const {
      securityAlertEmail,
      appName,
      appLogoUrl,
      appLogoDarkUrl,
      appEmailLogoUrl,
      appFaviconUrl,
      themeColorFrom,
      themeColorTo,
      topbarBgImage,
      escortRegistrationEnabled,
      memberRegistrationEnabled,
      agencyRegistrationEnabled,
      clubRegistrationEnabled,
      homeMenuEnabled,
      womenMenuEnabled,
      menMenuEnabled,
      couplesMenuEnabled,
      transMenuEnabled,
      companionsMenuEnabled,
      videosMenuEnabled,
      photoVerificationRequired,
      // Dashboard menu settings
      dashboardMenuPhotosEnabled,
      dashboardMenuReviewsEnabled,
      dashboardMenuVideosEnabled,
      dashboardMenuAvailablePromotionsEnabled,
      dashboardMenuBoostEnabled,
      dashboardMenuBuyCreditsEnabled,
      dashboardMenuVideoPromotionEnabled,
      dashboardMenuMessagesEnabled,
      dashboardMenuNotificationsEnabled,
      dashboardMenuSavedSearchEnabled,
      dashboardMenuInvoiceEnabled,
      dashboardMenuBalanceEnabled,
      // Launch settings
      launchCreditsEmailEnabled,
      promotionDurationSelectorEnabled,
      // Advertisement feature settings
      advertisementPromoStickerEnabled,
    } = req.body;

    const supabase = (getDatabaseService() as any).client;
    const now = new Date().toISOString();

    if (securityAlertEmail !== undefined) {
      if (
        securityAlertEmail !== "" &&
        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(securityAlertEmail)
      ) {
        throw new BadRequestError("Email de alerta inválido");
      }
    }

    // Build upserts array for all provided fields
    const upserts: { key: string; value: string; updated_at: string }[] = [];

    if (securityAlertEmail !== undefined) {
      upserts.push({ key: "security_alert_email", value: securityAlertEmail, updated_at: now });
    }
    if (appName !== undefined) {
      if (typeof appName !== "string" || appName.trim().length === 0) {
        throw new BadRequestError("El nombre de la app no puede estar vacío");
      }
      upserts.push({ key: "app_name", value: appName.trim(), updated_at: now });
    }
    if (appLogoUrl !== undefined) {
      upserts.push({ key: "app_logo_url", value: appLogoUrl, updated_at: now });
    }
    if (appLogoDarkUrl !== undefined) {
      upserts.push({ key: "app_logo_dark_url", value: appLogoDarkUrl, updated_at: now });
    }
    if (appEmailLogoUrl !== undefined) {
      upserts.push({ key: "app_email_logo_url", value: appEmailLogoUrl, updated_at: now });
    }
    if (appFaviconUrl !== undefined) {
      upserts.push({ key: "app_favicon_url", value: appFaviconUrl, updated_at: now });
    }
    if (themeColorFrom !== undefined) {
      if (themeColorFrom !== "" && !/^#[0-9a-fA-F]{3,8}$/.test(themeColorFrom)) {
        throw new BadRequestError("Color inicial inválido (formato hexadecimal requerido: #rrggbb)");
      }
      upserts.push({ key: "theme_color_from", value: themeColorFrom, updated_at: now });
    }
    if (themeColorTo !== undefined) {
      if (themeColorTo !== "" && !/^#[0-9a-fA-F]{3,8}$/.test(themeColorTo)) {
        throw new BadRequestError("Color final inválido (formato hexadecimal requerido: #rrggbb)");
      }
      upserts.push({ key: "theme_color_to", value: themeColorTo, updated_at: now });
    }
    if (topbarBgImage !== undefined) {
      upserts.push({ key: "topbar_bg_image", value: topbarBgImage, updated_at: now });
    }
    if (escortRegistrationEnabled !== undefined) {
      upserts.push({
        key: REGISTRATION_SETTING_KEYS.escortRegistrationEnabled,
        value: String(
          parseBooleanAdminInput(
            escortRegistrationEnabled,
            "escortRegistrationEnabled",
          ),
        ),
        updated_at: now,
      });
    }
    if (memberRegistrationEnabled !== undefined) {
      upserts.push({
        key: REGISTRATION_SETTING_KEYS.memberRegistrationEnabled,
        value: String(
          parseBooleanAdminInput(
            memberRegistrationEnabled,
            "memberRegistrationEnabled",
          ),
        ),
        updated_at: now,
      });
    }
    if (agencyRegistrationEnabled !== undefined) {
      upserts.push({
        key: REGISTRATION_SETTING_KEYS.agencyRegistrationEnabled,
        value: String(
          parseBooleanAdminInput(
            agencyRegistrationEnabled,
            "agencyRegistrationEnabled",
          ),
        ),
        updated_at: now,
      });
    }
    if (clubRegistrationEnabled !== undefined) {
      upserts.push({
        key: REGISTRATION_SETTING_KEYS.clubRegistrationEnabled,
        value: String(
          parseBooleanAdminInput(
            clubRegistrationEnabled,
            "clubRegistrationEnabled",
          ),
        ),
        updated_at: now,
      });
    }
    if (homeMenuEnabled !== undefined) {
      upserts.push({
        key: PUBLIC_MENU_SETTING_KEYS.homeMenuEnabled,
        value: String(parseBooleanAdminInput(homeMenuEnabled, "homeMenuEnabled")),
        updated_at: now,
      });
    }
    if (womenMenuEnabled !== undefined) {
      upserts.push({
        key: PUBLIC_MENU_SETTING_KEYS.womenMenuEnabled,
        value: String(parseBooleanAdminInput(womenMenuEnabled, "womenMenuEnabled")),
        updated_at: now,
      });
    }
    if (menMenuEnabled !== undefined) {
      upserts.push({
        key: PUBLIC_MENU_SETTING_KEYS.menMenuEnabled,
        value: String(parseBooleanAdminInput(menMenuEnabled, "menMenuEnabled")),
        updated_at: now,
      });
    }
    if (couplesMenuEnabled !== undefined) {
      upserts.push({
        key: PUBLIC_MENU_SETTING_KEYS.couplesMenuEnabled,
        value: String(parseBooleanAdminInput(couplesMenuEnabled, "couplesMenuEnabled")),
        updated_at: now,
      });
    }
    if (transMenuEnabled !== undefined) {
      upserts.push({
        key: PUBLIC_MENU_SETTING_KEYS.transMenuEnabled,
        value: String(parseBooleanAdminInput(transMenuEnabled, "transMenuEnabled")),
        updated_at: now,
      });
    }
    if (companionsMenuEnabled !== undefined) {
      upserts.push({
        key: PUBLIC_MENU_SETTING_KEYS.companionsMenuEnabled,
        value: String(parseBooleanAdminInput(companionsMenuEnabled, "companionsMenuEnabled")),
        updated_at: now,
      });
    }
    if (videosMenuEnabled !== undefined) {
      upserts.push({
        key: PUBLIC_MENU_SETTING_KEYS.videosMenuEnabled,
        value: String(parseBooleanAdminInput(videosMenuEnabled, "videosMenuEnabled")),
        updated_at: now,
      });
    }
    if (photoVerificationRequired !== undefined) {
      upserts.push({
        key: PHOTO_SETTING_KEYS.photoVerificationRequired,
        value: String(
          parseBooleanAdminInput(
            photoVerificationRequired,
            "photoVerificationRequired",
          ),
        ),
        updated_at: now,
      });
    }
    // Dashboard menu settings
    for (const [field, dbKey] of Object.entries(DASHBOARD_MENU_SETTING_KEYS)) {
      const value = (req.body as Record<string, unknown>)[field];
      if (value !== undefined) {
        upserts.push({
          key: dbKey,
          value: String(parseBooleanAdminInput(value, field)),
          updated_at: now,
        });
      }
    }
    // Launch settings
    if (launchCreditsEmailEnabled !== undefined) {
      upserts.push({
        key: LAUNCH_SETTING_KEYS.launchCreditsEmailEnabled,
        value: String(parseBooleanAdminInput(launchCreditsEmailEnabled, "launchCreditsEmailEnabled")),
        updated_at: now,
      });
    }
    if (promotionDurationSelectorEnabled !== undefined) {
      upserts.push({
        key: LAUNCH_SETTING_KEYS.promotionDurationSelectorEnabled,
        value: String(parseBooleanAdminInput(promotionDurationSelectorEnabled, "promotionDurationSelectorEnabled")),
        updated_at: now,
      });
    }
    // Advertisement feature settings
    if (advertisementPromoStickerEnabled !== undefined) {
      upserts.push({
        key: ADVERTISEMENT_SETTING_KEYS.advertisementPromoStickerEnabled,
        value: String(parseBooleanAdminInput(advertisementPromoStickerEnabled, "advertisementPromoStickerEnabled")),
        updated_at: now,
      });
    }

    if (upserts.length > 0) {
      const { error } = await supabase.from("admin_settings").upsert(upserts);

      if (error) throw error;
    }

    res.json({ data: { updated: true } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/branding/upload-logo
 * Uploads a logo image to Cloudinary and persists the resulting URL in admin_settings.
 * Body: { image: string (base64), type: 'logo' | 'logo_dark' | 'email_logo' | 'favicon' }
 */
export async function uploadBrandingLogo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { image, type } = req.body;

    if (!image || typeof image !== "string") {
      throw new BadRequestError("Se requiere una imagen en base64");
    }

    const validTypes = ["logo", "logo_dark", "email_logo", "favicon", "topbar"] as const;
    if (!validTypes.includes(type)) {
      throw new BadRequestError("type debe ser 'logo', 'logo_dark', 'email_logo', 'favicon' o 'topbar'");
    }

    const keyMap: Record<string, string> = {
      logo: "app_logo_url",
      logo_dark: "app_logo_dark_url",
      email_logo: "app_email_logo_url",
      favicon: "app_favicon_url",
      topbar: "topbar_bg_image",
    };

    const cloudinary = getCloudinaryService();
    const result = await cloudinary.uploadBase64Image(image, {
      folder: "luxxx/branding",
      tags: ["branding", type],
      transformation: type === "favicon"
        ? { width: 192, height: 192, crop: "fill", format: "png" }
        : type === "topbar"
        ? { quality: "auto", format: "webp" }
        : { quality: "auto", format: "webp" },
    });

    const supabase = (getDatabaseService() as any).client;
    const { error } = await supabase.from("admin_settings").upsert({
      key: keyMap[type],
      value: result.url,
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    res.json({
      data: {
        url: result.url,
        publicId: result.publicId,
        type,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/branding
 * Public endpoint — returns app branding info (name, logos) without auth.
 */
export async function getBranding(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const supabase = (getDatabaseService() as any).client;
    const { data, error } = await supabase
      .from("admin_settings")
      .select("key, value")
      .in("key", [
        "app_name",
        "app_logo_url",
        "app_logo_dark_url",
        "app_favicon_url",
        "theme_color_from",
        "theme_color_to",
        "topbar_bg_image",
        REGISTRATION_SETTING_KEYS.escortRegistrationEnabled,
        REGISTRATION_SETTING_KEYS.memberRegistrationEnabled,
        REGISTRATION_SETTING_KEYS.agencyRegistrationEnabled,
        REGISTRATION_SETTING_KEYS.clubRegistrationEnabled,
        PUBLIC_MENU_SETTING_KEYS.homeMenuEnabled,
        PUBLIC_MENU_SETTING_KEYS.womenMenuEnabled,
        PUBLIC_MENU_SETTING_KEYS.menMenuEnabled,
        PUBLIC_MENU_SETTING_KEYS.couplesMenuEnabled,
        PUBLIC_MENU_SETTING_KEYS.transMenuEnabled,
        PUBLIC_MENU_SETTING_KEYS.companionsMenuEnabled,
        PUBLIC_MENU_SETTING_KEYS.videosMenuEnabled,
        ...Object.values(DASHBOARD_MENU_SETTING_KEYS),
        LAUNCH_SETTING_KEYS.launchCreditsEmailEnabled,
        LAUNCH_SETTING_KEYS.promotionDurationSelectorEnabled,
        ADVERTISEMENT_SETTING_KEYS.advertisementPromoStickerEnabled,
      ]);

    if (error) throw error;

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }

    res.json({
      data: {
        appName: settings["app_name"] ?? "Luxxx",
        appLogoUrl: settings["app_logo_url"] ?? "",
        appLogoDarkUrl: settings["app_logo_dark_url"] ?? "",
        appFaviconUrl: settings["app_favicon_url"] ?? "",
        themeColorFrom: settings["theme_color_from"] ?? "",
        themeColorTo: settings["theme_color_to"] ?? "",
        topbarBgImage: settings["topbar_bg_image"] ?? "",
        escortRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.escortRegistrationEnabled],
          true,
        ),
        memberRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.memberRegistrationEnabled],
          true,
        ),
        agencyRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.agencyRegistrationEnabled],
          true,
        ),
        clubRegistrationEnabled: parseBooleanAdminSetting(
          settings[REGISTRATION_SETTING_KEYS.clubRegistrationEnabled],
          true,
        ),
        homeMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.homeMenuEnabled],
          true,
        ),
        womenMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.womenMenuEnabled],
          true,
        ),
        menMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.menMenuEnabled],
          true,
        ),
        couplesMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.couplesMenuEnabled],
          true,
        ),
        transMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.transMenuEnabled],
          true,
        ),
        companionsMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.companionsMenuEnabled],
          true,
        ),
        videosMenuEnabled: parseBooleanAdminSetting(
          settings[PUBLIC_MENU_SETTING_KEYS.videosMenuEnabled],
          true,
        ),
        // Dashboard menu settings
        dashboardMenuPhotosEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuPhotosEnabled],
          true,
        ),
        dashboardMenuReviewsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuReviewsEnabled],
          true,
        ),
        dashboardMenuVideosEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuVideosEnabled],
          true,
        ),
        dashboardMenuAvailablePromotionsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuAvailablePromotionsEnabled],
          true,
        ),
        dashboardMenuBoostEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuBoostEnabled],
          true,
        ),
        dashboardMenuBuyCreditsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuBuyCreditsEnabled],
          true,
        ),
        dashboardMenuVideoPromotionEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuVideoPromotionEnabled],
          true,
        ),
        dashboardMenuMessagesEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuMessagesEnabled],
          true,
        ),
        dashboardMenuNotificationsEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuNotificationsEnabled],
          true,
        ),
        dashboardMenuSavedSearchEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuSavedSearchEnabled],
          true,
        ),
        dashboardMenuInvoiceEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuInvoiceEnabled],
          true,
        ),
        dashboardMenuBalanceEnabled: parseBooleanAdminSetting(
          settings[DASHBOARD_MENU_SETTING_KEYS.dashboardMenuBalanceEnabled],
          true,
        ),
        // Launch settings
        launchCreditsEmailEnabled: parseBooleanAdminSetting(
          settings[LAUNCH_SETTING_KEYS.launchCreditsEmailEnabled],
          true,
        ),
        promotionDurationSelectorEnabled: parseBooleanAdminSetting(
          settings[LAUNCH_SETTING_KEYS.promotionDurationSelectorEnabled],
          true,
        ),
        // Advertisement feature settings
        advertisementPromoStickerEnabled: parseBooleanAdminSetting(
          settings[ADVERTISEMENT_SETTING_KEYS.advertisementPromoStickerEnabled],
          true,
        ),
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/photo-verifications
 * Returns photo verifications with optional status filter.
 * Query: ?status=PENDING|VERIFIED|REJECTED&page=1&limit=20
 */
export async function listPhotoVerifications(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string | undefined;

    const validStatuses = ['PENDING', 'VERIFIED', 'REJECTED'];
    const statusFilter = status && validStatuses.includes(status) ? status : undefined;

    const result = await appDb.getAllPhotoVerifications(page, limit, statusFilter);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/photo-verifications/:id
 * Approve or reject a photo verification.
 * Body: { status: 'VERIFIED' | 'REJECTED', adminComment?: string }
 */
export async function updatePhotoVerification(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body as { status: string; adminComment?: string };

    if (!status || !['VERIFIED', 'REJECTED'].includes(status)) {
      throw new BadRequestError("status debe ser 'VERIFIED' o 'REJECTED'");
    }

    const updated = await appDb.updatePhotoVerificationStatus(id, status as 'VERIFIED' | 'REJECTED', adminComment);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/settings/boost
 * Returns the current boost price per day.
 */
export async function getBoostSettings(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const priceStr = await appDb.getAdminSetting('boost_price_per_day');
    const pricePerDay = parseFloat(priceStr ?? '4.99');
    res.json({ success: true, data: { pricePerDay } });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/settings/boost
 * Updates the boost price per day.
 * Body: { pricePerDay: number }
 */
export async function updateBoostSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { pricePerDay } = req.body as { pricePerDay: number };
    if (!pricePerDay || isNaN(Number(pricePerDay)) || Number(pricePerDay) <= 0) {
      throw new BadRequestError('pricePerDay debe ser un número positivo');
    }
    await appDb.setAdminSetting('boost_price_per_day', String(Number(pricePerDay).toFixed(2)));
    res.json({ success: true, data: { pricePerDay: Number(pricePerDay) } });
  } catch (err) {
    next(err);
  }
}
