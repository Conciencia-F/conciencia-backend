import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

    if (!Object.values(ThemeCategory).includes(category as ThemeCategory)) {
      throw new BadRequestException(`La categoría '${category}' no es válida`);
    }

    const theme = await this.prisma.theme.findFirst({
      where: { category: category as ThemeCategory },
    });

    if (!theme) {
      throw new NotFoundException(`No se encontró un theme con la categoría: ${category}`)
    };

    await this.prisma.theme.updateMany({
      data: { isActive: false },
    });

    return this.prisma.theme.update({
      where: { id: theme.id },
      data: { isActive: true },
    });
  }

}
