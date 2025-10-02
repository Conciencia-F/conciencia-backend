//  Módulos Nativos de Node.js
import * as crypto from 'crypto';

// Dependencias de Terceros (npm)
import { RoleName } from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  Inject,
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
import { UsersDataService } from 'src/users/infra/users-data.services';
import { ALLOWED_ROLES, HASHER, Mailer, MAILER, PasswordHasher, TOKENS, USER_REPO, UserRepository, VerificationTokens } from './interfaces/ports';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly cfg: ConfigService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly logger: Logger,
    @Inject(USER_REPO) private readonly user: UserRepository,
    @Inject(HASHER) private readonly hasher: PasswordHasher,
    @Inject(TOKENS) private readonly tokens: VerificationTokens,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(ALLOWED_ROLES) private readonly allowed: ReadonlySet<RoleName>,
  ) { }

  /**
   * Maneja la lógica de negocio para registrar un nuevo usuario.
   * @param dto Los datos del usuario ya validados por el RegisterDto.
   */
  async register(dto: RegisterDto) {
    const { email, password, firstName, lastName, role } = dto;

    if (!this.allowed.has(role)) {
      throw new BadRequestException('El rol seleccionado no es válido');
    }

    if (await this.user.findByEmail(email)) {
      throw new ConflictException('El correo se encuentra en uso.');
    }

    const hashed = await this.hasher.hash(password);
    const user = await this.user.create({ email, password: hashed, firstName, lastName, role });
    const token = this.tokens.issue(user.id, 15 * 60);

    this.mailer.sendVerificationEmail(user.email, token)
      .catch(err => this.logger.warn(`verify email failed: ${err?.message ?? err}`));

    return {
      message: 'Usuario registrado correctamente. Se envió un correo de activación.',
      userId: user.id
    };
  }

  async login(
    dto: LoginDto,
  ): Promise<{ accessToken: TokenInfo; refreshToken: TokenInfo; user: any }> {
    try {
      const { email, password } = dto;
      const user = await this.user.findByEmail(email);

      if (!user) {
        throw new UnauthorizedException('Credenciales inválidas.');
      }

      if (!user.isVerified) {
        throw new UnauthorizedException('Cuenta no activada.');
      }

      const isPassword = await bcrypt.compare(password, user.password);
      if (!isPassword) {
        throw new UnauthorizedException('Credenciales inválidas.');
      }

      const payload: JwtPayload = { sub: user.id, email: user.email, role: user.roleId };
      const accessTtl = this.cfg.get<string>('JWT_ACCESS_TTL') || '1h';
      const accessToken = await this.jwtService.signAsync(payload, {
        expiresIn: accessTtl,
        jwtid: crypto.randomUUID(),
      });

      const refreshToken = await this.signAndStoreRefresh(user.id);

      const accessExpSec = typeof accessTtl === 'string' ? 3600 : Number(accessTtl);
      const refreshTtl = this.cfg.get<string>('JWT_REFRESH_TTL') || '7d';
      const refreshExpSec = typeof refreshTtl === 'string' ? 7 * 24 * 3600 : Number(refreshTtl);

      return {
        accessToken: { token: accessToken, expiresIn: accessExpSec },
        refreshToken: { token: refreshToken, expiresIn: refreshExpSec },
        user: { id: user.id, email: user.email, role: user.roleId },
      };
    } catch (e) {
      this.logger.error('Error en login:', e.stack);

      if (e instanceof UnauthorizedException) throw e;

      throw new UnauthorizedException('Error en inicio de sesión.');
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
