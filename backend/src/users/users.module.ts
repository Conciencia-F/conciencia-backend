// Dependencias de Terceros
import { Module } from '@nestjs/common';

// Modulos Internos
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersDataService } from './infra/users-data.services';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, UsersDataService],
  exports: [UsersDataService]
})
export class UsersModule { }
