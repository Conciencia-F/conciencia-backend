// Dependencias de Terceros
import { Injectable, Logger, NotFoundException } from '@nestjs/common';

// Modulos Internos
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma, RoleName } from '@prisma/client';

export type AuthenticatedUser = {
  userId: string;
  email: string;
  role: RoleName;
};

export type AuthRequest = Request & { user: AuthenticatedUser }

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(private prisma: PrismaService) { }

  /**
   * Returns a list of users. If a search term is provided,
   * it filters the results by first name, last name, or email.
   * @param searchTerm Optional search term.
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

  /**
   * Finds a single user by their ID.
   * @param id The user's ID.
   * @returns The user found.
   * @throws {NotFoundException} If the user with the given ID is not found.
   */
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
      throw new NotFoundException(`User with ID "${id}" not found`);
    }

    return user;
  }

  /**
   * Updates the role of a specific user.
   * @param userId The ID of the user to update.
   * @param updateUserRoleDto DTO containing the new role.
   * @returns The updated user object without the password.
   * @throws {NotFoundException} If the user with the given ID is not found.
   */
  async updateRole(
    userId: string,
    updateUserRoleDto: UpdateUserRoleDto,
    adminUser: AuthenticatedUser,
  ) {
    const { role } = updateUserRoleDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
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
      `ADMIN: [${adminUser.email}] updated user ${user.email}'s role (ID: ${userId}) to ${role}.`,
    );

    const { password, ...result } = updateUser;
    return result;
  }

  /**
   * Returns a list of all available role names.
   * @returns An array of RoleName enums.
   */
  async findAllRoles(): Promise<RoleName[]> {
    return Object.values(RoleName);
  }
}
