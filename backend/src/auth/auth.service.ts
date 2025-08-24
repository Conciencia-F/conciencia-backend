//  Módulos Nativos de Node.js
import * as crypto from 'crypto';

// Dependencias de Terceros (npm)
import { RoleName } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

//  Módulos Internos de la Aplicación
import { EmailService } from 'src/email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../shared/redis/redis.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { TokenInfo } from './interfaces/token-info.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Maneja la lógica de negocio para registrar un nuevo usuario.
   * @param dto Los datos del usuario ya validados por el RegisterDto.
   */
  async register(dto: RegisterDto) {
    const { email, password, firstName, lastName, role } = dto;
    const allowedPublicRoles: RoleName[] = [
      RoleName.AUTHOR,
      RoleName.STUDENT,
      RoleName.INVESTIGATOR,
    ];

    if (!allowedPublicRoles.includes(role)) {
      throw new BadRequestException('El rol seleccionado no es válido');
    }

    try {
      const userExists = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (userExists) {
        throw new ConflictException('El correo se encuentra en uso.');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await this.prismaService.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: {
            connect: { name: role },
          },
          isVerified: false,
        },
      });

      const verifyToken = this.jwtService.sign(
        { sub: user.id },
        { expiresIn: '15m' },
      );

      await this.emailService.sendVerificationEmail(user.email, verifyToken);

      return {
        message:
          'Usuario registrado correctamente. Se envió un correo de activación.',
        userId: user.id,
      };
    } catch (e) {
      this.logger.error('Error durante el registro:', e.stack);

      if (e instanceof ConflictException || e instanceof BadRequestException) {
        throw e;
      }

      throw new BadRequestException(
        'Ocurrió un error inesperado durante el registro.',
      );
    }
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: TokenInfo; refreshToken: TokenInfo; user: any }> {
    try {
      const { email, password } = dto;

      if (!email || !password) {
        throw new UnauthorizedException(
          'Por favor, completa todos los campos para iniciar sesión.',
        );
      }

      const user = await this.prismaService.user.findUnique({
        where: { email },
        include: {
          role: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException(
          'Credenciales inválidas. Intente nuevamente.',
        );
      }

      if (!user.isVerified) {
        throw new UnauthorizedException(
          'Tu cuenta no está activada. Verifica tu correo para activar tu cuenta.',
        );
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException(
          'Credenciales inválidas. Intente nuevamente.',
        );
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role.name,
      };

      const accessTokenExpiration = 3600; // 1 hora en segundos
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: accessTokenExpiration,
      });

      const refreshTokenExpiration = 604800; // 1 semana en segundos
      const refreshToken = this.jwtService.sign(
        { sub: user.id },
        { expiresIn: refreshTokenExpiration },
      );

      await this.redisService.set(
        `refresh_${user.id}`,
        refreshToken,
        refreshTokenExpiration,
      );

      return {
        accessToken: {
          token: accessToken,
          expiresIn: accessTokenExpiration,
          type: 'access',
        },
        refreshToken: {
          token: refreshToken,
          expiresIn: refreshTokenExpiration,
          type: 'refresh',
        },
        user: { id: user.id, email: user.email, role: user.role.name },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      console.error('Error en el proceso de login:', e);
      throw new UnauthorizedException(
        'Ocurrió un error durante el inicio de sesión. Intente nuevamente.',
      );
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: TokenInfo }> {
    try {
      const decoded = this.jwtService.verify(refreshToken) as { sub: string };
      const userId = decoded.sub;

      const storedToken = await this.redisService.get(`refresh_${userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
        },
      });
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role.name,
      };

      const accessTokenExpiration = 3600;
      const newAccessToken = this.jwtService.sign(payload, {
        expiresIn: accessTokenExpiration,
      });

      return {
        accessToken: {
          token: newAccessToken,
          expiresIn: accessTokenExpiration,
          type: 'access',
        },
      };
    } catch (e) {
      if (e instanceof UnauthorizedException) {
        throw e;
      }
      throw new UnauthorizedException('Token de refresco inválido o expirado');
    }
  }

  async logout(accessToken: string, refreshToken?: string) {
    const decodedAccess = this.jwtService.decode(accessToken) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    const exp = decodedAccess.exp ?? now;
    const ttl = exp - now;
    if (ttl > 0) {
      await this.redisService.set(`bl_${accessToken}`, 'true', ttl);
    }

    if (refreshToken) {
      try {
        const decodedRefresh = this.jwtService.decode(refreshToken) as {
          sub: string;
        };
        if (decodedRefresh.sub) {
          await this.redisService.del(`refresh_${decodedRefresh.sub}`);
        }
      } catch (e) {
        console.error('Error al invalidar refresh token:', e);
      }
    }
  }

  async verifyEmail(token: string): Promise<string> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(token);
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.isVerified) {
      return 'Tu cuenta ya estaba verificada.';
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    return 'Cuenta verificada correctamente';
  }

  async generatePasswordResetToken(email: string): Promise<string> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.warn(
          `Intento de restablecimiento de contraseña para un usuario no encontrado: ${email}`,
        );

        throw new NotFoundException('Usuario no encontrado');
      }

      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hora

      await this.prismaService.user.update({
        where: { email },
        data: {
          resetToken,
          resetTokenExpiry: tokenExpiry,
        },
      });

      this.logger.log(
        `Token de restablecimiento generado para el usuario: ${email}`,
      );

      return resetToken;
    } catch (e) {
      this.logger.error(
        'Error al generar el token de restablecimiento',
        e.stack,
      );

      throw new BadRequestException('Token invalidado o expirado');
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<string> {
    try {
      const user = await this.prismaService.user.findFirst({
        where: {
          resetToken: token,
          resetTokenExpiry: {
            gte: new Date(),
          },
        },
      });

      if (!user) {
        throw new BadRequestException('Token inválido o expirado');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.prismaService.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null,
        },
      });

      return 'Contraseña actualizada correctamente';
    } catch (e) {
      this.logger.error('Error al cambiar la contraseña', e.stack);
      throw new BadRequestException('No se pudo cambiar la contraseña');
    }
  }
}
