import { RoleName, User } from '@prisma/client';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: { email: string; password: string; firstName: string; lastName: string; role: RoleName; }): Promise<User>;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
}

export interface VerificationTokens {
  issue(sub: string, ttlSec: number): string;
}

export interface Mailer {
  sendVerificationEmail(to: string, token: string): Promise<void>;
}

export const USER_REPO = Symbol('UserRepository');
export const HASHER = Symbol('PasswordHasher');
export const TOKENS = Symbol('VerificationTokens');
export const MAILER = Symbol('Mailer');
export const ALLOWED_ROLES = Symbol('AllowedRoles'); // ReadonlySet<RoleName>

