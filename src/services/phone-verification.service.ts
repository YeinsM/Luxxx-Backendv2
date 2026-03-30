import { config } from '../config';
import {
  BadRequestError,
  InternalServerError,
  TooManyRequestsError,
} from '../models/error.model';
import { normalizePhoneNumber } from '../utils/phone.utils';

type VerificationSession = {
  normalizedPhone: string;
  sentAt: number;
  expiresAt: number;
  failedCheckCount: number;
  locked: boolean;
};

type TwilioVerificationResponse = {
  status?: string;
  valid?: boolean;
  message?: string;
  code?: number;
  more_info?: string;
};

/**
 * Thin wrapper around Twilio Verify.
 *
 * We keep a lightweight in-memory session store only for product rules that
 * Twilio does not expose directly to the frontend: resend cooldown and a local
 * "max 5 attempts before requesting a fresh code" guard.
 */
export class PhoneVerificationService {
  private static instance: PhoneVerificationService;
  private sessions = new Map<string, VerificationSession>();

  private constructor() {}

  static getInstance(): PhoneVerificationService {
    if (!PhoneVerificationService.instance) {
      PhoneVerificationService.instance = new PhoneVerificationService();
    }

    return PhoneVerificationService.instance;
  }

  async sendVerificationCode(
    advertisementId: string,
    phone: string,
  ): Promise<{ normalizedPhone: string; cooldownSeconds: number; expiresInSeconds: number }> {
    this.ensureConfigured();
    this.purgeExpiredSessions();

    const normalizedPhone = normalizePhoneNumber(phone);
    const sessionKey = this.buildSessionKey(advertisementId, normalizedPhone);
    const existingSession = this.sessions.get(sessionKey);
    const resendCooldownMs = config.twilio.resendCooldownSeconds * 1000;

    if (existingSession) {
      const remainingCooldownMs = resendCooldownMs - (Date.now() - existingSession.sentAt);
      if (remainingCooldownMs > 0) {
        throw new TooManyRequestsError(
          `Espera ${Math.ceil(remainingCooldownMs / 1000)} segundos antes de solicitar un nuevo código.`,
        );
      }
    }

    this.clearSessionsForAdvertisement(advertisementId);

    const payload = new URLSearchParams({
      To: normalizedPhone,
      Channel: 'sms',
    });

    const twilioResponse = await this.performTwilioRequest(
      `${config.twilio.verifyBaseUrl}/Services/${config.twilio.verifyServiceSid}/Verifications`,
      payload,
      'No se pudo enviar el código de verificación por SMS',
    );

    if (!twilioResponse.status || twilioResponse.status === 'canceled') {
      throw new InternalServerError('Twilio no confirmó el envío del código SMS');
    }

    const now = Date.now();
    this.sessions.set(sessionKey, {
      normalizedPhone,
      sentAt: now,
      expiresAt: now + config.twilio.codeExpiresInSeconds * 1000,
      failedCheckCount: 0,
      locked: false,
    });

    return {
      normalizedPhone,
      cooldownSeconds: config.twilio.resendCooldownSeconds,
      expiresInSeconds: config.twilio.codeExpiresInSeconds,
    };
  }

  async checkVerificationCode(
    advertisementId: string,
    phone: string,
    code: string,
  ): Promise<{ normalizedPhone: string }> {
    this.ensureConfigured();
    this.purgeExpiredSessions();

    const normalizedPhone = normalizePhoneNumber(phone);
    const sessionKey = this.buildSessionKey(advertisementId, normalizedPhone);
    const session = this.sessions.get(sessionKey);

    if (session?.locked) {
      throw new TooManyRequestsError(
        'Superaste el máximo de intentos. Solicita un nuevo código SMS.',
      );
    }

    if (session && Date.now() > session.expiresAt) {
      this.sessions.delete(sessionKey);
      throw new BadRequestError('El código SMS expiró. Solicita uno nuevo.');
    }

    if ((session?.failedCheckCount ?? 0) >= config.twilio.maxCheckAttempts) {
      throw new TooManyRequestsError(
        'Superaste el máximo de intentos. Solicita un nuevo código SMS.',
      );
    }

    const payload = new URLSearchParams({
      To: normalizedPhone,
      Code: code.trim(),
    });

    const twilioResponse = await this.performTwilioRequest(
      `${config.twilio.verifyBaseUrl}/Services/${config.twilio.verifyServiceSid}/VerificationCheck`,
      payload,
      'No se pudo validar el código SMS',
    );

    const isApproved = twilioResponse.status === 'approved' || twilioResponse.valid === true;
    if (isApproved) {
      this.sessions.delete(sessionKey);
      return { normalizedPhone };
    }

    const previousFailedChecks = session?.failedCheckCount ?? 0;
    const failedCheckCount = previousFailedChecks + 1;
    const attemptsLeft = Math.max(config.twilio.maxCheckAttempts - failedCheckCount, 0);

    this.sessions.set(sessionKey, {
      normalizedPhone,
      sentAt: session?.sentAt ?? Date.now(),
      expiresAt: session?.expiresAt ?? (Date.now() + config.twilio.codeExpiresInSeconds * 1000),
      failedCheckCount,
      locked: failedCheckCount >= config.twilio.maxCheckAttempts,
    });

    if (failedCheckCount >= config.twilio.maxCheckAttempts) {
      throw new TooManyRequestsError(
        'Superaste el máximo de intentos. Solicita un nuevo código SMS.',
      );
    }

    throw new BadRequestError(
      `Código incorrecto. Te quedan ${attemptsLeft} intento${attemptsLeft === 1 ? '' : 's'}.`,
    );
  }

  private ensureConfigured(): void {
    if (
      !config.twilio.accountSid ||
      !config.twilio.authToken ||
      !config.twilio.verifyServiceSid
    ) {
      throw new InternalServerError('Twilio Verify no está configurado en el servidor');
    }
  }

  private buildSessionKey(advertisementId: string, normalizedPhone: string): string {
    return `${advertisementId}:${normalizedPhone}`;
  }

  private clearSessionsForAdvertisement(advertisementId: string): void {
    for (const sessionKey of this.sessions.keys()) {
      if (sessionKey.startsWith(`${advertisementId}:`)) {
        this.sessions.delete(sessionKey);
      }
    }
  }

  private purgeExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionKey, session] of this.sessions.entries()) {
      if (session.expiresAt <= now) {
        this.sessions.delete(sessionKey);
      }
    }
  }

  private async performTwilioRequest(
    url: string,
    body: URLSearchParams,
    fallbackMessage: string,
  ): Promise<TwilioVerificationResponse> {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${config.twilio.accountSid}:${config.twilio.authToken}`,
        ).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: body.toString(),
    });

    const rawBody = await response.text();
    let parsedBody: TwilioVerificationResponse = {};

    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody) as TwilioVerificationResponse;
      } catch {
        parsedBody = {};
      }
    }

    if (!response.ok) {
      const upstreamMessage = parsedBody.message?.trim();
      throw response.status === 429
        ? new TooManyRequestsError(upstreamMessage || fallbackMessage)
        : new BadRequestError(upstreamMessage || fallbackMessage);
    }

    return parsedBody;
  }
}

export const getPhoneVerificationService = (): PhoneVerificationService =>
  PhoneVerificationService.getInstance();

