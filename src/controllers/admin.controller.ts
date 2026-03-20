import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { getDatabaseService } from "../services/database.service";
import { getAppDatabaseService } from "../services/app-database.service";
import { BadRequestError, NotFoundError } from "../models/error.model";
import { getEmailService } from "../services/email.service";
import { generateSetupToken } from "../utils/jwt.utils";
import { config } from "../config";
import { getCloudinaryService } from "../services/cloudinary.service";

const db = getDatabaseService();
const appDb = getAppDatabaseService();

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
    const plans = await appDb.getPromotionPlans();
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
    const { pricePerDay, pricePerWeek, pricePerMonth, features, isActive } =
      req.body;

    const plan = await appDb.updatePromotionPlan(id, {
      pricePerDay: pricePerDay !== undefined ? Number(pricePerDay) : undefined,
      pricePerWeek:
        pricePerWeek !== undefined ? Number(pricePerWeek) : undefined,
      pricePerMonth:
        pricePerMonth !== undefined ? Number(pricePerMonth) : undefined,
      features: features ?? undefined,
      isActive: isActive !== undefined ? Boolean(isActive) : undefined,
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
      .select("id, name, user_id, users!inner(email)")
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
        emailService
          .sendVerificationStatusEmail(userEmail, adData.name, status, comment?.trim())
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
    const frontendUrl =
      (config as any).email?.frontendUrl ??
      process.env.FRONTEND_URL ??
      "http://localhost:3000";
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
 * Returns admin panel settings (branding, security config).
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
        appName:        settings["app_name"]          ?? "Luxxx",
        appLogoUrl:     settings["app_logo_url"]      ?? "",
        appLogoDarkUrl: settings["app_logo_dark_url"] ?? "",
        appFaviconUrl:  settings["app_favicon_url"]   ?? "",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/admin/settings
 * Updates admin panel settings (security config + app name).
 */
export async function updateAdminSettings(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { securityAlertEmail, appName } = req.body;
    const supabase = (getDatabaseService() as any).client;
    const now = new Date().toISOString();
    const upserts: { key: string; value: string; updated_at: string }[] = [];

    if (securityAlertEmail !== undefined) {
      if (
        securityAlertEmail !== "" &&
        !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(securityAlertEmail)
      ) {
        throw new BadRequestError("Email de alerta inválido");
      }
      upserts.push({ key: "security_alert_email", value: securityAlertEmail, updated_at: now });
    }

    if (appName !== undefined) {
      const trimmed = String(appName).trim();
      if (!trimmed) throw new BadRequestError("El nombre de la aplicación no puede estar vacío");
      upserts.push({ key: "app_name", value: trimmed, updated_at: now });
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

const VALID_LOGO_TYPES = ["logo", "logo_dark", "favicon"] as const;
type LogoType = typeof VALID_LOGO_TYPES[number];
const LOGO_SETTING_KEY: Record<LogoType, string> = {
  logo:      "app_logo_url",
  logo_dark: "app_logo_dark_url",
  favicon:   "app_favicon_url",
};

/**
 * POST /api/admin/settings/logo
 * Uploads a branding image (logo / logo_dark / favicon) to Cloudinary
 * and persists the resulting URL in admin_settings.
 * Body: { image: string (base64), type: 'logo' | 'logo_dark' | 'favicon' }
 */
export async function uploadBrandingLogo(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { image, type } = req.body as { image: string; type: string };

    if (!image || typeof image !== "string") {
      throw new BadRequestError("El campo 'image' (base64) es requerido");
    }
    if (!VALID_LOGO_TYPES.includes(type as LogoType)) {
      throw new BadRequestError(`'type' debe ser uno de: ${VALID_LOGO_TYPES.join(", ")}`);
    }

    const cloudinary = getCloudinaryService();
    const result = await cloudinary.uploadBase64Image(image, {
      folder: "luxxx/branding",
      tags: ["branding", type],
      transformation: { quality: "auto", format: "webp" },
    });

    const settingKey = LOGO_SETTING_KEY[type as LogoType];
    const supabase = (getDatabaseService() as any).client;
    const { error } = await supabase
      .from("admin_settings")
      .upsert({ key: settingKey, value: result.url, updated_at: new Date().toISOString() });

    if (error) throw error;

    res.json({ data: { url: result.url } });
  } catch (err) {
    next(err);
  }
}
