import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RedisService } from '../shared/redis/redis.service';
import { TokenInfo } from './interfaces/token-info.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDto) {
    const { email, password, firstName, lastName, role } = dto;

    const userExists = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException(`El ${email} se encuentra en uso.`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prismaService.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role,
      },
    });

    return { message: 'Usuario registrado correctamente', userId: user.id };
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
        role: user.role,
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

      // Almacenar refresh token en Redis
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
        user: { id: user.id, email: user.email, role: user.role },
      };
    } catch (error) {
      // Si es una excepción conocida (UnauthorizedException), la lanzamos como está
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      // Para otros errores inesperados, log y lanzar excepción genérica
      console.error('Error en el proceso de login:', error);
      throw new UnauthorizedException(
        'Ocurrió un error durante el inicio de sesión. Intente nuevamente.',
      );
    }
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<{ accessToken: TokenInfo }> {
    try {
      //Verificamos firma y expiración del refresh token
      const decoded = this.jwtService.verify(refreshToken) as { sub: string };
      const userId = decoded.sub;

      // Verificamos si el refresh token esta en Redis
      // Si fue invalidado por logout no estara
      const storedToken = await this.redisService.get(`refresh_${userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token inválido');
      }

      const user = await this.prismaService.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
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
    // Invalidar access token
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
      } catch (error) {
        console.error('Error al invalidar refresh token:', error);
      }
    }
  }
}
