import { Role } from '../interfaces/role.enum';

export class RegisterResponseDTO {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isVerified: boolean;
}
