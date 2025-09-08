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
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';

// Modulos Internos
import { AuthenticatedUser, UsersService } from './users.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { Request } from 'express';

type AuthRequest = Request & { user: AuthenticatedUser }


@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.DIRECTOR)
@ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
@ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Forbidden' })
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Get()
  @ApiOperation({ summary: 'Get a list of all users' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users obtained successfully.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Term to search users by first name, last name, or email.',
  })
  findAll(@Query('search') searchTerm?: string) {
    return this.usersService.findAll(searchTerm);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of roles obtained successfully.',
  })
  findAllRoles() {
    return this.usersService.findAllRoles();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by their ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User obtained successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User with the provided ID was not found.',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: "Update a specific user's role" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The user's role has been updated successfully.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User with the provided ID was not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'The provided role is not valid.',
  })
  updateRole(
    @Param('id') id: string,
    @Body() updateUserRoleDto: UpdateUserRoleDto,
    @Req() req: AuthRequest
  ) {
    if (!req.user) {
      throw new UnauthorizedException('asdfasd')
    }

    const userAdmin = req.user;

    return this.usersService.updateRole(id, updateUserRoleDto, userAdmin);
  }
}
