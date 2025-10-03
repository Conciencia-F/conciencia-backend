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
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
  ) { }

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
          isVerified: true,
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

      const [accessToken, refreshToken] = await Promise.all(
        [this.jwtService.signAsync(payload, { expiresIn: 3600 }),
        this.signAndStoreRefresh(user.id),
        ])

      return {
        accessToken: { token: accessToken, expiresIn: 3600 },
        refreshToken: { token: refreshToken, expiresIn: 604800 },
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role.name
        },
      };
    } catch (e) {
      this.logger.error('Error en el proceso de login:', e.stack);

      if (e instanceof UnauthorizedException) {
        throw e;
      }

      throw new UnauthorizedException(
        'Ocurrió un error inesperado durante el inicio de sesión.',
      );
    }
  }

  private async signAndStoreRefresh(userId: string) {
    const jti = crypto.randomUUID();
    const refresh = await this.jwtService.signAsync(
      { sub: userId, jti },
      {
        secret: this.cfg.get('JWT_REFRESH_SECRET'),
        expiresIn: this.cfg.get('JWT_REFRESH_TTL')
      }
    );

    const payload = this.jwtService.decode(refresh);
    const expiresAt = new Date(payload.exp * 1000);

    await this.prismaService.refreshToken.create({
      data: {
        id: jti,
        userId,
        hashedToken: await bcrypt.hash(refresh, 10),
        expiresAt,
      }
    })

    return refresh
  }


  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: TokenInfo; refreshToken: TokenInfo }> {

    const { sub, jti } = await this.jwtService.verifyAsync<{ sub: string; jti: string }>(
      refreshToken,
      { secret: this.cfg.get<string>('JWT_REFRESH_SECRET') },
    );

    const rec = await this.prismaService.refreshToken.findUnique({ where: { id: jti } });
    if (!rec || rec.revoked || rec.userId !== sub || rec.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh inválido');
    }

    const ok = await bcrypt.compare(refreshToken, rec.hashedToken);
    if (!ok) throw new UnauthorizedException('Refresh inválido');

    return this.prismaService.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: jti }, data: { revoked: true } });

      const accessExp = 3600;
      const newAccess = await this.jwtService.signAsync(
        { sub, },
        { expiresIn: accessExp },
      );

      const newRefresh = await this.signAndStoreRefresh(sub);

      return {
        accessToken: { token: newAccess, expiresIn: accessExp },
        refreshToken: { token: newRefresh, expiresIn: 604800 }, // o desde env
      };
    });
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
        const { jti, sub } = await this.jwtService.verifyAsync<{ jti: string; sub: string }>(
          refreshToken,
          { secret: this.cfg.get<string>('JWT_REFRESH_SECRET') },
        );

        await this.prismaService.refreshToken.updateMany({
          where: { id: jti, userId: sub, revoked: false },
          data: { revoked: true },
        });
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
