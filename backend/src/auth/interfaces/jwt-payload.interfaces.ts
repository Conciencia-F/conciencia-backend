export interface JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
  iat?: number; // issued at (timestamp)
  exp?: number; // expiration (timestamp)
}
