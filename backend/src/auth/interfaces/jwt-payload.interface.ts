export interface JwtPayload {
  sub: string; // userId
  email?: string;
  token_type?: 'access' | 'refresh';
  jti?: string;
  role?: string;
  iat?: number; // issued at
  exp?: number; // expiration time
}
