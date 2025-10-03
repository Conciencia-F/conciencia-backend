// Dependencias de Terceros
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

// Módulos Internos de la Aplicación
import { EmailService } from 'src/email/email.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { RegisterDto } from './dtos/register.dto';
import { TokenInfo } from './interfaces/token-info.interface';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';
import { RefreshDto } from './dtos/refresh.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailService: EmailService,
  ) { }

  @Post('register')
  // Documentación Swagger
  @ApiOperation({ summary: 'Registrar un nuevo usuario' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Usuario registrado exitosamente.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Los datos proporcionados son inválidos.',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El correo electrónico ya está en uso.',
  })
  // Fin del swagger
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  // Documentación del Swagger
  @ApiOperation({ summary: 'Iniciar sesion de un usuario' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Inicio de sesion exitoso. Devuelve tokens de acceso y de refresco',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Credenciales incorrectas o cuenta no verificada',
  })
  // Fin del Swagger
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization!;
    const token = authHeader.split(' ')[1];
    await this.authService.logout(token);
    return { message: 'Sesión cerrada correctamente' };
  }

  refresh(@Body() dto: RefreshDto) {
    return this.authService.refreshAccessToken(dto.refreshToken);
  }

  @Get('verify-email/:token')
  verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('request-password-reset')
  async requestPasswordReset(@Body('email') email: string) {
    const resetToken = await this.authService.generatePasswordResetToken(email);

    await this.emailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'Correo de recuperación enviado' };
  }
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }
}
