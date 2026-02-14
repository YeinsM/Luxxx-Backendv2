import { v4 as uuidv4 } from 'uuid';
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
  EscortUser,
  MemberUser,
  AgencyUser,
  ClubUser,
} from '../models/user.model';
import { getDatabaseService } from './database.service';
import { getEmailService } from './email.service';
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
    const user = await this.db.getUserByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials');
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
    const user = await this.db.getUserByEmail(dto.email);
    
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
    await this.db.updateUser(userId, { password: hashedPassword } as any);

    return {
      success: true,
      message: 'Password changed successfully',
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
}
