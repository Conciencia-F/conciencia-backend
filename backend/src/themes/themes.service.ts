import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ThemeCategory, Prisma } from '@prisma/client';

@Injectable()
export class ThemesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.theme.findMany();
  }

  findActive() {
    return this.prisma.theme.findFirst({
      where: { isActive: true },
    });
  }


    async activateByCategory(category: string) {
    const theme = await this.prisma.theme.findFirst({
      where: { category: category as ThemeCategory },
    });

    if (!theme) throw new Error("No se encontró un theme con esa categoría");

    await this.prisma.theme.updateMany({
      data: { isActive: false },
    });

    return this.prisma.theme.update({
      where: { id: theme.id },
      data: { isActive: true },
    });
  }

}
