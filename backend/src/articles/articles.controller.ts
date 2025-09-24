import { Controller, Post, Body, Req, UseGuards, Get } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Artículos')
@Controller('articles')

export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) { }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo artículo' })
  @ApiResponse({ status: 201, description: 'Artículo creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'La temática seleccionada no existe o datos inválidos.' })
  async create(
    @Body() CreateArticleDto: CreateArticleDto,
    @Req() req
  ) {
    const userId = req.user.userId;
    return this.articlesService.create(CreateArticleDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los artículos' })
  @ApiResponse({ status: 200, description: 'Lista de artículos.' })
  async findAll() {
    return this.articlesService.findAll();
  }
}

