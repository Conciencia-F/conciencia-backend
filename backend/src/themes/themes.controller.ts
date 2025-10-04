import { RoleName } from '@prisma/client';
import { 
  Controller, 
  Get, 
  UseGuards, 
  Patch, 
  Param 
} from '@nestjs/common';
import { ThemesService } from './themes.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorators';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Themes')
@ApiBearerAuth()   
@Controller('themes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN, RoleName.DIRECTOR)
export class ThemesController {
  constructor(private readonly themesService: ThemesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener todos los temas' })
  @ApiResponse({ status: 200, description: 'Lista de todos los temas' })
  findAll() {
    return this.themesService.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener tema activo' })
  @ApiResponse({ status: 200, description: 'Devuelve el tema actualmente activo' })
  findActive() {
    return this.themesService.findActive();
  }

  @Patch('activate/:category')
  @ApiOperation({ summary: 'Activar un tema por categoría' })
  @ApiParam({ name: 'category', type: String, description: 'Categoría del tema a activar' })
  @ApiResponse({ status: 200, description: 'Tema activado correctamente' })
  @ApiResponse({ status: 404, description: 'No se encontró la categoría' })
  activateByCategory(@Param('category') category: string) {
    return this.themesService.activateByCategory(category);
  }
}
