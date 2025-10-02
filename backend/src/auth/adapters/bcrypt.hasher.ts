import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PasswordHasher } from '../interfaces/ports';

@Injectable() export class BcryptHasher implements PasswordHasher {

  /*
   *
   *
   */
  hash(passwordHasher: string) {
    return bcrypt.hash(passwordHasher, 10);
  }
}

