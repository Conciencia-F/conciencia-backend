import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'El nuevo rol que se asignará al usuario',
    enum: RoleName,
    example: RoleName.REVIEWER,
  })
  @IsNotEmpty({ message: 'El rol no puede estar vacío.' })
  @IsEnum(RoleName, { message: 'El rol proporcionado no es válido.' })
  role: RoleName;
}
