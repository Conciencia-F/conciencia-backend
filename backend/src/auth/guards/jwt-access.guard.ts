import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAccessGuard extends AuthGuard('jwt-access') {
  handleRequest(err: any, user: any) {
    if (err || !user || user.token_type !== 'access') throw err || new UnauthorizedException();

    return user;
  }
}

