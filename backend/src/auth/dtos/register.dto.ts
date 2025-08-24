import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { RoleName } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';

/**
 * RegisterDto define la estructura y las reglas de validación para los datos
 * que se reciben en el endpoint de registro de nuevos usuarios.
 * NestJS usará esta clase para validar automáticamente el cuerpo de la petición.
 */
export class RegisterDto {
  @ApiProperty({
    description: 'El nombre del usuario',
    example: 'Mateo',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: 'El apellido del usuario',
    example: 'Cuellar',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: 'El correo electrónico del usuario',
    example: 'mateo.uñas@example.com',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description:
      'La contraseña del usuario. Debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.',
    example: 'Password123',
  })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
    message:
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número',
  })
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'El rol seleccionado por el usuario al registrarse.',
    enum: RoleName,
    example: RoleName.AUTHOR,
  })
  @IsEnum(RoleName)
  @IsNotEmpty()
  role: RoleName;
}
