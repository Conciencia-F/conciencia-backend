import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { Request } from 'express';
import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { extractRefresh } from '../utils/token-extractors';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private cfg: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: (req: Request) => extractRefresh(req),
      secretOrKey: cfg.getOrThrow<string>('JWT_REFRESH_SECRET'),
      algorithms: ['HS256'],
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    if (payload.token_type !== 'refresh') throw new UnauthorizedException();
    const raw = extractRefresh(req);
    if (!raw) throw new UnauthorizedException();

    const rec = await this.prisma.refreshToken.findUnique({
      where: { id: payload.jti },
    });
    if (
      !rec ||
      rec.revoked ||
      rec.userId !== payload.sub ||
      rec.expiresAt < new Date()
    ) {
      throw new UnauthorizedException();
    }

    const ok = await bcrypt.compare(raw, rec.hashedToken);
    if (!ok) throw new UnauthorizedException();

    return {
      sub: payload.sub,
      jti: payload.jti,
      token_type: 'refresh',
    };
  }
}
