import { IsJWT, IsString } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsJWT({ message: 'refreshToken debe ser un JWT válido' })
  refreshToken!: string;
}

