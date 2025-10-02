import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { VerificationTokens } from '../interfaces/ports';

@Injectable() export class JwtVerificationTokens implements VerificationTokens {
  constructor(private readonly jwt: JwtService) { }

  /*
   *
   */
  issue(sub: string, ttlSec: number) {
    return this.jwt.sign({ sub }, { expiresIn: `${ttlSec}s` });
  }

}

