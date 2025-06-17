export interface TokenInfo {
  token: string;
  expiresIn: number;
  type: 'access' | 'refresh';
}
