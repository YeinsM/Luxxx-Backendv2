import { v4 as uuidv4 } from 'uuid';
import { createHash, randomBytes } from 'crypto';
import {
  User,
  UserType,
  RegisterEscortDto,
  RegisterMemberDto,
  RegisterAgencyDto,
  RegisterClubDto,
  LoginDto,
  AuthResponse,
  RegistrationResponse,
  ResendVerificationDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  EscortUser,
  MemberUser,
  AgencyUser,
  ClubUser,
} from '../models/user.model';
import { getDatabaseService } from './database.service';
import { getEmailService } from './email.service';
import { getAppDatabaseService } from './app-database.service';
import { hashPassword, comparePassword } from '../utils/password.utils';
import { generateToken } from '../utils/jwt.utils';
import { BadRequestError, UnauthorizedError } from '../models/error.model';

export class AuthService {
  private db = getDatabaseService();
  private emailService = getEmailService();

  async registerEscort(dto: RegisterEscortDto): Promise<RegistrationResponse> {
    this.validatePassword(dto.password);

    const hashedPassword = await hashPassword(dto.password);
    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 horas

    const user: EscortUser = {
      id: uuidv4(),
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      userType: UserType.ESCORT,
      name: dto.name,
      phone: dto.phone,
      city: dto.city,
      age: dto.age,
      createdAt: new Date(),
      updatedAt: new Date(),
      tokenVersion: 0,
      isActive: true,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      photos: [],
      videos: [],
    };

    const createdUser = await this.db.createUser(user);
    
    // Send verification email (non-blocking)
    this.emailService.sendVerificationEmail(createdUser, verificationToken).catch((error) => {
      console.error('Failed to send verification email:', error);
    });
    
    return {
      success: true,
      message: 'Registro exitoso. Por favor verifica tu email antes de iniciar sesión.',
      email: createdUser.email,
    };
  }

  async registerMember(dto: RegisterMemberDto): Promise<RegistrationResponse> {
    this.validatePassword(dto.password);

    const hashedPassword = await hashPassword(dto.password);
    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    const user: MemberUser = {
      id: uuidv4(),
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      userType: UserType.MEMBER,
      username: dto.username,
      city: dto.city,
      createdAt: new Date(),
      updatedAt: new Date(),
      tokenVersion: 0,
      isActive: true,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      photos: [],
      videos: [],
    };

    const createdUser = await this.db.createUser(user);
    
    // Send verification email (non-blocking)
    this.emailService.sendVerificationEmail(createdUser, verificationToken).catch((error) => {
      console.error('Failed to send verification email:', error);
    });
    
    return {
      success: true,
      message: 'Registro exitoso. Por favor verifica tu email antes de iniciar sesión.',
      email: createdUser.email,
    };
  }

  async registerAgency(dto: RegisterAgencyDto): Promise<RegistrationResponse> {
    this.validatePassword(dto.password);

    const hashedPassword = await hashPassword(dto.password);
    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    const user: AgencyUser = {
      id: uuidv4(),
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      userType: UserType.AGENCY,
      agencyName: dto.agencyName,
      phone: dto.phone,
      city: dto.city,
      website: dto.website,
      createdAt: new Date(),
      updatedAt: new Date(),
      tokenVersion: 0,
      isActive: true,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      photos: [],
      videos: [],
    };

    const createdUser = await this.db.createUser(user);
    
    // Send verification email (non-blocking)
    this.emailService.sendVerificationEmail(createdUser, verificationToken).catch((error) => {
      console.error('Failed to send verification email:', error);
    });
    
    return {
      success: true,
      message: 'Registro exitoso. Por favor verifica tu email antes de iniciar sesión.',
      email: createdUser.email,
    };
  }

  async registerClub(dto: RegisterClubDto): Promise<RegistrationResponse> {
    this.validatePassword(dto.password);

    const hashedPassword = await hashPassword(dto.password);
    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    const user: ClubUser = {
      id: uuidv4(),
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      userType: UserType.CLUB,
      clubName: dto.clubName,
      phone: dto.phone,
      address: dto.address,
      city: dto.city,
      website: dto.website,
      openingHours: dto.openingHours,
      createdAt: new Date(),
      updatedAt: new Date(),
      tokenVersion: 0,
      isActive: true,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
      photos: [],
      videos: [],
    };

    const createdUser = await this.db.createUser(user);
    
    // Send verification email (non-blocking)
    this.emailService.sendVerificationEmail(createdUser, verificationToken).catch((error) => {
      console.error('Failed to send verification email:', error);
    });
    
    return {
      success: true,
      message: 'Registro exitoso. Por favor verifica tu email antes de iniciar sesión.',
      email: createdUser.email,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.db.getUserByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedError('El email no existe en nuestra base de datos');
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('La contraseña es incorrecta');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Verificar que el email esté verificado
    if (!user.emailVerified) {
      throw new UnauthorizedError('Por favor verifica tu email antes de iniciar sesión');
    }

    return this.generateAuthResponse(user);
  }

  async getUserById(userId: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.db.getUserById(userId);
    if (!user) {
      return null;
    }
    return this.removePassword(user);
  }

  async acceptPrivacyConsent(userId: string): Promise<Omit<User, 'password'>> {
    const user = await this.db.getUserById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const updatedUser = await this.db.updateUser(userId, {
      privacyConsentAcceptedAt: new Date(),
    } as Partial<User>);

    if (!updatedUser) {
      throw new BadRequestError('No se pudo guardar la aceptación de privacidad');
    }

    return this.removePassword(updatedUser);
  }

  async softDeleteAccount(userId: string): Promise<{ success: boolean; softDeletedAt: string }> {
    const user = await this.db.getUserById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    if (!user.isActive) {
      const alreadyDeletedAt = user.softDeletedAt ?? new Date();
      return {
        success: true,
        softDeletedAt: alreadyDeletedAt.toISOString(),
      };
    }

    const softDeletedAt = new Date();
    const updatedUser = await this.db.updateUser(userId, {
      isActive: false,
      softDeletedAt,
      tokenVersion: user.tokenVersion + 1,
    } as Partial<User>);

    if (!updatedUser) {
      throw new BadRequestError('No se pudo terminar la cuenta');
    }

    // Soft-delete advertisement visibility so public profile is no longer shown.
    try {
      const appDb = getAppDatabaseService();
      await appDb.softDeleteAdvertisementsByUserId(userId);
    } catch (error) {
      console.error('Failed to soft-delete advertisements for user:', userId, error);
    }

    return {
      success: true,
      softDeletedAt: softDeletedAt.toISOString(),
    };
  }

  async verifyEmail(token: string): Promise<AuthResponse> {
    const user = await this.db.getUserByVerificationToken(token);
    
    if (!user) {
      throw new BadRequestError('Token de verificación inválido');
    }

    // Verificar que el token no haya expirado
    if (user.emailVerificationExpires && user.emailVerificationExpires < new Date()) {
      throw new BadRequestError('El token de verificación ha expirado');
    }

    // Actualizar usuario: marcar como verificado y limpiar token
    const updatedUser = await this.db.updateUser(user.id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
    });

    if (!updatedUser) {
      throw new BadRequestError('Error al verificar el email');
    }

    // Enviar email de bienvenida
    this.emailService.sendWelcomeEmail(updatedUser).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    // Retornar token JWT para auto-login
    return this.generateAuthResponse(updatedUser);
  }

  async resendVerification(dto: ResendVerificationDto): Promise<{ success: boolean; message: string }> {
    const user = await this.db.getUserByEmail(dto.email.toLowerCase());
    
    if (!user) {
      throw new BadRequestError('Email no encontrado');
    }

    if (user.emailVerified) {
      throw new BadRequestError('El email ya está verificado');
    }

    // Generar nuevo token
    const verificationToken = uuidv4();
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    await this.db.updateUser(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    });

    // Reenviar email de verificación
    this.emailService.sendVerificationEmail(user, verificationToken).catch((error) => {
      console.error('Failed to send verification email:', error);
    });

    return {
      success: true,
      message: 'Email de verificación reenviado',
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    this.validatePassword(newPassword);

    const user = await this.db.getUserById(userId);
    if (!user) {
      throw new BadRequestError('User not found');
    }

    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const hashedPassword = await hashPassword(newPassword);
    await this.db.updateUser(userId, {
      password: hashedPassword,
      tokenVersion: user.tokenVersion + 1,
      passwordResetTokenHash: undefined,
      passwordResetExpires: undefined,
      passwordResetUsedAt: undefined,
    } as any);

    return {
      success: true,
      message: 'Password changed successfully',
    };
  }

  async requestPasswordReset(dto: ForgotPasswordDto): Promise<{ success: boolean; message: string }> {
    const normalizedEmail = dto.email.toLowerCase();
    const user = await this.db.getUserByEmail(normalizedEmail);

    if (!user) {
      return {
        success: true,
        message: 'Si el email existe, enviamos instrucciones para recuperar tu contraseña.',
      };
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await this.db.updateUser(user.id, {
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: expiresAt,
      passwordResetUsedAt: undefined,
    });

    this.emailService.sendPasswordResetEmail(user, rawToken).catch((error) => {
      console.error('Failed to send password reset email:', error);
    });

    return {
      success: true,
      message: 'Si el email existe, enviamos instrucciones para recuperar tu contraseña.',
    };
  }

  async validatePasswordResetToken(token: string): Promise<{ valid: boolean }> {
    const tokenHash = this.hashResetToken(token);
    const user = await this.db.getUserByPasswordResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestError('Token inválido o expirado');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestError('Token inválido o expirado');
    }

    if (user.passwordResetUsedAt) {
      throw new BadRequestError('Token inválido o expirado');
    }

    return { valid: true };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ success: boolean; message: string }> {
    this.validatePassword(dto.newPassword);

    const tokenHash = this.hashResetToken(dto.token);
    const user = await this.db.getUserByPasswordResetTokenHash(tokenHash);

    if (!user) {
      throw new BadRequestError('Token inválido o expirado');
    }

    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      throw new BadRequestError('Token inválido o expirado');
    }

    if (user.passwordResetUsedAt) {
      throw new BadRequestError('Token inválido o expirado');
    }

    const hashedPassword = await hashPassword(dto.newPassword);
    const updatedUser = await this.db.updateUser(user.id, {
      password: hashedPassword,
      tokenVersion: user.tokenVersion + 1,
      passwordResetTokenHash: undefined,
      passwordResetExpires: undefined,
      passwordResetUsedAt: new Date(),
    } as any);

    if (!updatedUser) {
      throw new BadRequestError('No se pudo actualizar la contraseña');
    }

    return {
      success: true,
      message: 'Contraseña actualizada correctamente. Inicia sesión nuevamente.',
    };
  }

  private validatePassword(password: string): void {
    if (password.length < 6) {
      throw new BadRequestError('Password must be at least 6 characters long');
    }
  }

  private generateAuthResponse(user: User): AuthResponse {
    const token = generateToken({
      userId: user.id,
      email: user.email,
      userType: user.userType,
      tokenVersion: user.tokenVersion,
    });

    return {
      user: this.removePassword(user),
      token,
    };
  }

  private removePassword(user: User): Omit<User, 'password'> {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
