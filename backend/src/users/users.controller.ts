// Dependencia de terceros
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

// Modulos Internos
import { UsersService } from './users.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.DIRECTOR)
@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'No autorizado' })
@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Acceso denegado' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener una lista de todos los usuarios' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de usuarios obtenida exitosamente',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Término para buscar usuarios por nombre, apellido o email.',
  })
  findAll(@Query('search') searchTerm?: string) {
    return this.usersService.findAll(searchTerm);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un usuario por su ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Usuario obtenido exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El usuario con el ID proporcionado no fue encontrado.',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Actualizar el rol de un usuario específico' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'El rol del usuario ha sido actualizado exitosamente.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El usuario con el ID proporcionado no fue encontrado.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'El rol proporcionado no es válido.',
  })
  updateRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
  ) {
    return this.usersService.updateRole(id, updateUserRoleDto);
  }
}
