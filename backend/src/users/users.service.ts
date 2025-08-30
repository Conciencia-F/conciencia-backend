// Dependencias de Terceros
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// Modulos Internos
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {
    return 'This action adds a new user';
  }

  findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  async updateRole(userId: string, updateUserRoleDto: UpdateUserRoleDto) {
    const { role } = updateUserRoleDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${userId}" no encontrado`);
    }

    const updateUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        role: {
          connect: { name: role },
        },
      },
      include: {
        role: true,
      },
    });

    this.logger.log(
      `El rol del usuario ${user.email} (ID: ${userId}) fue cambiado a ${role}.`,
    );

    const { password, ...result } = updateUser;
    return result;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
