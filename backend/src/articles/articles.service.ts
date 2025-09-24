import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleType, ThemeCategory } from '@prisma/client';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) { }

  async create(createArticleDto: CreateArticleDto, userId: string) {
    // Determinar el tipo de artículo
    const type: ArticleType =
      createArticleDto.articleType === 'Paper Científico'
        ? ArticleType.SCIENTIFIC_ARTICLE
        : ArticleType.STUDENT_LOG;

    // Conversión con mapeo string legible desde el frontend -> enum Prisma
    const themeMap: Record<string, ThemeCategory> = {
      // Temas PaperDto
      'Investigación Científica y Tecnológica': ThemeCategory.INVESTIGACION_CIENTIFICA_Y_TECNOLOGICA,
      'Innovación y Desarrollo (I+D)': ThemeCategory.INNOVACION_Y_DESARROLLO_ID,
      'Educación Científica y Tecnológica': ThemeCategory.EDUCACION_CIENTIFICA_Y_TECNOLOGICA,
      'Ciencia y Sociedad': ThemeCategory.CIENCIA_Y_SOCIEDAD,
      'Políticas Públicas en Ciencia y Tecnología': ThemeCategory.POLITICAS_PUBLICAS_EN_CIENCIA_Y_TECNOLOGIA,
      'Producción y Desarrollo Local': ThemeCategory.PRODUCCION_Y_DESARROLLO_LOCAL,
      'Juventud Investigadora': ThemeCategory.JUVENTUD_INVESTIGADORA,
      'Mujeres y Diversidades en la Ciencia': ThemeCategory.MUJERES_Y_DIVERSIDADES_EN_LA_CIENCIA,
      'Perspectiva Formoseña': ThemeCategory.PERSPECTIVA_FORMOSENA,
      'Recensiones y Reseña': ThemeCategory.RECENSIONES_Y_RESEÑA,
      // Temas BitacoraDto
      'Desarrollo de Software': ThemeCategory.DESARROLLO_DE_SOFTWARE,
      'Telecomunicaciones': ThemeCategory.TELECOMUNICACIONES,
      'Mecatrónica': ThemeCategory.MECATRONICA,
      'Química Industrial': ThemeCategory.QUIMICA_INDUSTRIAL,
    };

    // Convertir el string enviado por el frontend a enum
    const themeCategory = themeMap[createArticleDto.articleTheme.theme];

    // Buscar la temática existente en la DB
    const theme = await this.prisma.theme.findUnique({
      where: { category: themeCategory },
    });

    if (!theme) {
      // No se permite crear temáticas desde la interfaz
      throw new BadRequestException('La temática seleccionada no existe.');
    }

    // Crear el artículo
    const article = await this.prisma.article.create({
      data: {
        title: createArticleDto.title,
        abstract: createArticleDto.abstract,
        type,
        userId,
        themeId: theme.id,
        tags: createArticleDto.tags.join(','),
      },
    });

    // Crear autores asociados
    const authorsData = createArticleDto.authors.map((author) => ({
      articleId: article.id,
      name: author.name,
      email: author.email,
      affiliation: author.affiliation,
    }));

    await this.prisma.authorsOnArticles.createMany({
      data: authorsData,
    });

    // Crear bibliografías asociadas 
    const bibliographiesData = createArticleDto.bibliographies.map((ref) => ({
      articleId: article.id,
      reference: ref,
    }));

    await this.prisma.bibliography.createMany({
      data: bibliographiesData,
    });

    return "Artículo creado con éxito";
  }

  async findAll() {
    return this.prisma.article.findMany({
      include: {
        authors: true,         // Incluye los autores asociados al artículo
        theme: true,           // Incluye la temática del artículo
        bibliographies: true,  // Incluye las bibliografías asociadas
      },
    });
  }
}
