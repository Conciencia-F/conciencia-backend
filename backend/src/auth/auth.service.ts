import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { RedisService } from 'src/shared/redis/redis.service';

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

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = await this.prismaService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales Inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales Inválidas');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, role: user.role },
    };
  }

  async logout(token: string) {
    const decoded = this.jwtService.decode(token) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    const exp = decoded.exp ?? now;
    const ttl = exp - now;
    if (ttl > 0) {
      await this.redisService.set(`bl_${token}`, 'true', ttl);
    }
  }
}
