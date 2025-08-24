// Dependencias de terceros
import { Logger, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

// Módulos Internos de la Aplicacion
import { EmailModule } from 'src/email/email.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { RedisModule } from '../shared/redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    PassportModule,
    RedisModule,
    PrismaModule,
    EmailModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET as string,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, Logger],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
