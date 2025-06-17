import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RegisterDto } from './dtos/register.dto';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dtos/login.dto';

// Simulación de user
const users = new Map<string, { email: string; password: string }>();

@Injectable()
export class AuthService {
  async register(dto: RegisterDto) {
    const { email, password } = dto;

    if (users.has(email)) {
      throw new Error(`El ${email} está en uso.`);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    users.set(email, { email, password: hashedPassword });

    return { message: 'Usuario registrado correctamente' };
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;

    const user = users.get(email);
    if (!user) {
      throw new UnauthorizedException('Credenciales Inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales Inválidas');
    }

    // Aca va el token JWT
    return { message: 'Inicio de sesión correctamente' };
  }
}
