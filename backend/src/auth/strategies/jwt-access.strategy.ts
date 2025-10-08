import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../shared/redis/redis.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(cfg: ConfigService, private redis: RedisService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: cfg.getOrThrow<string>('JWT_ACCESS_SECRET'),
      algorithms: ['HS256'],
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.token_type !== 'access') throw new UnauthorizedException();
    const blocked = await this.redis.get(`bl_jti_${payload.jti}`);
    if (blocked) throw new UnauthorizedException();
    return { ...payload };
  }
}

