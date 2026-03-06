import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  userId: string;
  email: string;
  userType: string;
  tokenVersion: number;
  role?: string; // USER | ADMIN
}

export interface SetupTokenPayload {
  type: 'admin_setup';
  userId: string;
  email: string;
}

// ── Regular user tokens ────────────────────────────────────────────────────────

export const generateToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  } as SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// ── Admin tokens (separate secret, shorter expiry) ────────────────────────────

export const generateAdminToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, config.adminJwt.secret, {
    expiresIn: config.adminJwt.expiresIn,
  } as SignOptions);
};

export const verifyAdminToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, config.adminJwt.secret) as JwtPayload;
  } catch {
    throw new Error('Invalid admin token');
  }
};

// ── Short-lived setup tokens (sent via email link, 15 min) ────────────────────

export const generateSetupToken = (userId: string, email: string): string => {
  const payload: SetupTokenPayload = { type: 'admin_setup', userId, email };
  return jwt.sign(payload, config.adminJwt.secret, {
    expiresIn: config.adminJwt.setupTokenExpires,
  } as SignOptions);
};

export const verifySetupToken = (token: string): SetupTokenPayload => {
  const payload = jwt.verify(token, config.adminJwt.secret) as SetupTokenPayload;
  if (payload.type !== 'admin_setup') throw new Error('Invalid token type');
  return payload;
};
