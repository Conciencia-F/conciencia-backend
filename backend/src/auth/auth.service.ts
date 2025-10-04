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

const nowSec = () => Math.floor(Date.now() / 1000);
const remainingSecs = (jwt: string, jwtService: JwtService) => {
  const decoded = jwtService.decode(jwt) as { exp?: number } | null;
  if (!decoded?.exp) return 0;
  return Math.max(0, decoded.exp - nowSec());
};
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly emailService: EmailService,
  ) { }

  /**
   * Registro de usuario.
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
      const exists = await this.prisma.user.findUnique({ where: { email } });
      if (exists) throw new ConflictException('El correo se encuentra en uso.');

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName,
          lastName,
          role: { connect: { name: role } },
          isVerified: true,
        },
      });

      const verifyToken = this.jwtService.sign({ sub: user.id }, { expiresIn: '15m' });
      await this.emailService.sendVerificationEmail(user.email, verifyToken);

      return {
        message:
          'Usuario registrado correctamente. Se envió un correo de activación.',
        userId: user.id,
      };
    } catch (e) {
      this.logger.error('Error durante el registro:', e.stack);
      if (e instanceof ConflictException || e instanceof BadRequestException) throw e;
      throw new BadRequestException('Ocurrió un error inesperado durante el registro.');
    }
  }

  /**
   * Login: devuelve access y refresh; ambos con expiresIn numérico.
   * Access: HS256 con JWT_ACCESS_SECRET, TTL = JWT_ACCESS_TTL ("3600" | "1h").
   * Refresh: HS256 con JWT_REFRESH_SECRET, TTL = JWT_REFRESH_TTL ("604800" | "7d"), guardado hasheado en DB y con jti.
   */
  async login(dto: LoginDto): Promise<{ accessToken: TokenInfo; refreshToken: TokenInfo; user: any }> {
    try {
      const { email, password } = dto;

      const user = await this.prisma.user.findUnique({
        where: { email },
        include: { role: true },
      });
      if (!user) throw new UnauthorizedException('Credenciales inválidas. Intente nuevamente.');
      if (!user.isVerified) throw new UnauthorizedException('Tu cuenta no está activada. Verifica tu correo.');

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) throw new UnauthorizedException('Credenciales inválidas. Intente nuevamente.');

      const accessPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role.name,
        token_type: 'access',
        jti: crypto.randomUUID(),
      };

      const accessTtl = this.cfg.getOrThrow<string>('JWT_ACCESS_TTL');   // "3600" o "1h"
      const refreshTtl = this.cfg.getOrThrow<string>('JWT_REFRESH_TTL'); // "604800" o "7d"

      const accessToken = await this.jwtService.signAsync(accessPayload, {
        secret: this.cfg.getOrThrow('JWT_ACCESS_SECRET'),
        algorithm: 'HS256',
        expiresIn: accessTtl,
      });

      const refreshToken = await this.signAndStoreRefresh(user.id, refreshTtl);

      return {
        accessToken: { token: accessToken, expiresIn: remainingSecs(accessToken, this.jwtService) },
        refreshToken: { token: refreshToken, expiresIn: remainingSecs(refreshToken, this.jwtService) },
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role.name,
        },
      };
    } catch (e) {
      this.logger.error('Error en el proceso de login:', e.stack);
      if (e instanceof UnauthorizedException) throw e;
      throw new UnauthorizedException('Ocurrió un error inesperado durante el inicio de sesión.');
    }
  }

  /**
   * Firma y persiste un refresh rotatorio en DB con jti y hash.
   */
  private async signAndStoreRefresh(userId: string, ttl?: string) {
    const jti = crypto.randomUUID();
    const refresh = await this.jwtService.signAsync(
      { sub: userId, token_type: 'refresh', jti } as JwtPayload,
      {
        secret: this.cfg.getOrThrow('JWT_REFRESH_SECRET'),
        algorithm: 'HS256',
        expiresIn: ttl ?? this.cfg.getOrThrow<string>('JWT_REFRESH_TTL'),
      },
    );

    const payload = this.jwtService.decode(refresh) as { exp: number };
    const expiresAt = new Date(payload.exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        userId,
        hashedToken: await bcrypt.hash(refresh, 10),
        expiresAt,
        // revoked: false por defecto si el schema lo define
      },
    });

    return refresh;
  }

  /**
   * Rotación de refresh: valida firma, estado en DB, consume el actual y emite nuevo par.
   * El refresh se espera por header (p. ej. X-Refresh-Token) desde el controlador.
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: TokenInfo; refreshToken: TokenInfo }> {
    const { sub, jti, token_type } = await this.jwtService.verifyAsync<{
      sub: string; jti: string; token_type: 'refresh';
    }>(refreshToken, {
      secret: this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET'),
      algorithms: ['HS256'],
    });

    if (token_type !== 'refresh') throw new UnauthorizedException('Refresh inválido');

    const rec = await this.prisma.refreshToken.findUnique({ where: { id: jti } });
    if (!rec || rec.revoked || rec.userId !== sub || rec.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh inválido');
    }
    const ok = await bcrypt.compare(refreshToken, rec.hashedToken);
    if (!ok) throw new UnauthorizedException('Refresh inválido');

    return this.prisma.$transaction(async (tx) => {
      await tx.refreshToken.update({ where: { id: jti }, data: { revoked: true } });

      const accessPayload: JwtPayload = {
        sub,
        token_type: 'access',
        jti: crypto.randomUUID(),
      };

      const accessTtl = this.cfg.getOrThrow<string>('JWT_ACCESS_TTL');
      const newAccess = await this.jwtService.signAsync(accessPayload, {
        secret: this.cfg.getOrThrow('JWT_ACCESS_SECRET'),
        algorithm: 'HS256',
        expiresIn: accessTtl,
      });

      const newRefresh = await this.signAndStoreRefresh(sub);

      return {
        accessToken: { token: newAccess, expiresIn: remainingSecs(newAccess, this.jwtService) },
        refreshToken: { token: newRefresh, expiresIn: remainingSecs(newRefresh, this.jwtService) },
      };
    });
  }

  /**
   * Logout: blacklist del access por jti (y fallback por hash) + revocación opcional del refresh.
   */
  async logout(accessToken: string, refreshToken?: string) {
    try {
      const decoded = this.jwtService.decode(accessToken) as Partial<JwtPayload> | null;
      const exp = decoded?.exp ?? nowSec();
      const ttl = Math.max(1, exp - nowSec());

      if (decoded?.jti) {
        await this.redis.set(`bl_jti_${decoded.jti}`, '1', ttl);
      } else {
        await this.redis.set(`bl_${sha256(accessToken)}`, '1', ttl);
      }
    } catch (e) {
      this.logger.warn(`No se pudo blacklistear access token: ${String(e)}`);
    }

    if (refreshToken) {
      try {
        const { jti, sub } = await this.jwtService.verifyAsync<{ jti: string; sub: string }>(
          refreshToken,
          { secret: this.cfg.getOrThrow<string>('JWT_REFRESH_SECRET') },
        );
        await this.prisma.refreshToken.updateMany({
          where: { id: jti, userId: sub, revoked: false },
          data: { revoked: true },
        });
      } catch (e) {
        this.logger.warn(`Error al invalidar refresh token: ${String(e)}`);
      }
    }
  }

  /**
   * Verificación de email con token corto.
   */
  async verifyEmail(token: string): Promise<string> {
    let payload: { sub: string };
    try {
      payload = this.jwtService.verify<{ sub: string }>(token);
    } catch {
      throw new BadRequestException('Token inválido o expirado');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (user.isVerified) return 'Tu cuenta ya estaba verificada.';

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    return 'Cuenta verificada correctamente';
  }

  /**
   * Password reset: generación de token.
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) throw new NotFoundException('Usuario no encontrado');

      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 3600 * 1000); // 1h

      await this.prisma.user.update({
        where: { email },
        data: { resetToken, resetTokenExpiry: tokenExpiry },
      });

      this.logger.log(`Token de restablecimiento generado para: ${email}`);
      return resetToken;
    } catch (e) {
      this.logger.error('Error al generar el token de restablecimiento', e.stack);
      throw new BadRequestException('Token invalidado o expirado');
    }
  }

  /**
   * Password reset: actualización de contraseña.
   */
  async resetPassword(token: string, newPassword: string): Promise<string> {
    try {
      const user = await this.prisma.user.findFirst({
        where: { resetToken: token, resetTokenExpiry: { gte: new Date() } },
      });
      if (!user) throw new BadRequestException('Token inválido o expirado');

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetToken: null, resetTokenExpiry: null },
      });

      return 'Contraseña actualizada correctamente';
    } catch (e) {
      this.logger.error('Error al cambiar la contraseña', e.stack);
      throw new BadRequestException('No se pudo cambiar la contraseña');
    }
  }
}
