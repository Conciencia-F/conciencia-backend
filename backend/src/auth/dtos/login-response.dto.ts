import { Role } from '../interfaces/role.enum';
import { TokenInfo } from '../interfaces/token-info.interface';

export class LoginResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isVerified: boolean;
  accessToken: string;
  refreshToken?: string;
  sessionTokens?: TokenInfo[];
}
