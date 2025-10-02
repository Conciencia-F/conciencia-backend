import { ConflictException, Injectable } from '@nestjs/common';
import { Prisma, RoleName, User } from '@prisma/client';
import { UserRepository } from 'src/auth/interfaces/ports';
import { PrismaService } from 'src/prisma/prisma.service';

type Tx = Prisma.TransactionClient
type Db = PrismaService | Tx

@Injectable()
export class UsersDataService implements UserRepository {
  constructor(private prisma: PrismaService) { }

  private orm(db?: Db): Db {
    return db ?? this.prisma
  }

  // =================== CREATE ====================

  /**
   *
   * 
   *
   */
  async create(data: {
    email: string; password: string; firstName: string; lastName: string; role: RoleName;
  }, db?: Db): Promise<User> {
    try {
      const { email, password, firstName, lastName, role } = data;

      return await this.orm(db).user.create({
        data: {
          email, password, firstName, lastName,
          role: { connect: { name: role } },
          isVerified: false,
        },
      });

    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException('El correo se encuentra en uso.');
      }
      throw e;
    }
  }

  // =================== READ ====================

  /**
   *
   *
   */
  findByEmail(email: string, db?: Db) {
    return this.orm(db).user.findUnique({
      where: { email },
      include: { role: true }
    })
  }

  /**
   *
   *
   */
  findById(id: string, db?: Db) {
    return this.orm(db).user.findUnique({
      where: { id },
      include: { role: true }
    })
  }

  /**
   *
   *
   */
  findByValidResetToken(token: string, db?: Db) {
    return this.orm(db).user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gte: new Date() } }
    })
  }

  // =================== UPDATE ====================

  /**
   *
   *
   *
   */
  verifyUser(id: string, db?: Db) {
    return this.orm(db).user.update({
      where: { id },
      data: { isVerified: true },
    });
  }

  /**
     *
     *
     *
   */
  setResetToken(email: string, token: string, expiresAt: Date, db?: Db) {
    return this.orm(db).user.update({
      where: { email },
      data: { resetToken: token, resetTokenExpiry: expiresAt },
    });
  }

  /**
     *
     *
     *
  */
  updatePasswordAndClearReset(id: string, hashed: string, db?: Db) {
    return this.orm(db).user.update({
      where: { id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });
  }

}
