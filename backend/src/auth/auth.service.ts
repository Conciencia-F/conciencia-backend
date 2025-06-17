import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterDTO } from './dtos/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDTO } from './dtos/login.dto';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from './redis/redis.service';
import { JwtPayload } from './interfaces/jwt-payload.interface';

// Simulación de user
const users = new Map<string, { email: string; password: string }>();

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async register(dto: RegisterDTO) {
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

  async login(dto: LoginDTO) {
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
}
