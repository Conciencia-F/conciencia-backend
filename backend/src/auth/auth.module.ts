// Dependencias de terceros
import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

// Módulos Internos de la Aplicacion
import { USER_REPO, HASHER, TOKENS, MAILER, ALLOWED_ROLES } from './interfaces/ports';
import { EmailModule } from 'src/email/email.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from 'src/users/users.module';
import { UsersDataService } from 'src/users/infra/users-data.services';
import { BcryptHasher } from './adapters/bcrypt.hasher';
import { JwtVerificationTokens } from './adapters/jwt.tokens';
import { EmailService } from 'src/email/email.service';
import { RoleName } from '@prisma/client';

@Module({
  imports: [
    PassportModule,
    RedisModule,
    PrismaModule,
    EmailModule,
    UsersModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: cfg.get<string>('JWT_ACCESS_TTL') }
      }),
    }),
  ],

  providers: [AuthService, Logger, JwtStrategy,
    { provide: USER_REPO, useExisting: UsersDataService },
    { provide: HASHER, useClass: BcryptHasher },
    { provide: TOKENS, useClass: JwtVerificationTokens },
    { provide: MAILER, useExisting: EmailService },
    {
      provide: ALLOWED_ROLES,
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): Set<string> =>
        new Set(cfg.get<RoleName[]>('auth.allowedPublicRoles') ?? ['AUTHOR', 'STUDENT', 'INVESTIGATOR']),
    },
  ],

  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule { }
