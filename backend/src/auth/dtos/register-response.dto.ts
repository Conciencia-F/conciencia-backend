import { Role } from '../interfaces/role.enum';

export class RegisterResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  accessToken: string;
}
