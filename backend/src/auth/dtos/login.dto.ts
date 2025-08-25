import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * LoginDto define la estructura y las reglas de validacion para los
 * datos que se reciben en el endpoint de inicio de sesion
 */
export class LoginDto {
  @ApiProperty({
    description: 'El correo electrónico del usuario',
    example: 'mateo.uñas@example.com',
  })
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'La contraseña del usuario',
    example: 'Password123',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;
}
