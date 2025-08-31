// Dependencias de Terceros
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// Modulos Internos
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, RoleName } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Devuelve una lista de usuarios. Si se provee un término de búsqueda,
   * filtra los resultados por nombre, apellido o email.
   * @param searchTerm Término de búsqueda opcional.
   */
  async findAll(searchTerm?: string) {
    const whereClause: Prisma.UserWhereInput = searchTerm
      ? {
          OR: [
            { firstName: { contains: searchTerm, mode: 'insensitive' } },
            { lastName: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ],
        }
      : {};

    return this.prisma.user.findMany({
      where: whereClause,
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

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      throw new NotFoundException(`Usuario con ID "${id}" no encontrado`);
    }

    return user;
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

  async findAllRoles(): Promise<RoleName[]> {
    return Object.values(RoleName);
  }
}
