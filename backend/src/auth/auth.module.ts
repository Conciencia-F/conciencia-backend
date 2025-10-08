// Dependencias de terceros
import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Módulos Internos de la Aplicacion
import { EmailModule } from 'src/email/email.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({}),
    JwtModule.register({}),
    PrismaModule,
    RedisModule,
    EmailModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAccessStrategy,   // Authorization: Bearer <access>
    JwtRefreshStrategy,  // X-Refresh-Token / Authorization: Bearer <refresh>
  ],
  exports: [AuthService],
})

export class AuthModule { }
