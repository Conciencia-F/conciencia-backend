import { Controller, Get, Body, Patch, Param } from '@nestjs/common';
import { ThemesService } from './themes.service';

@Controller('themes')
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  findAll() {
    return this.themesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.themesService.findActive();
  }

  @Patch('activate/:category')
  activateByCategory(@Param('category') category: string) {
    return this.themesService.activateByCategory(category);
  }
}
