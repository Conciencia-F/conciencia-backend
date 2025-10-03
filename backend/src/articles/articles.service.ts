import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArticleType, ThemeCategory } from '@prisma/client';

@Injectable()
export class ArticlesService {
  constructor(private prisma: PrismaService) {}

  async create(
    createArticleDto: CreateArticleDto,
    userId: string,
    files: {
      images?: Express.Multer.File[];
      document?: Express.Multer.File[];
    },
  ) {
    // Determinar el tipo de artículo
    const type: ArticleType =
      createArticleDto.articleType === 'Paper Científico'
        ? ArticleType.SCIENTIFIC_ARTICLE
        : ArticleType.STUDENT_LOG;

    // Conversión con mapeo string legible desde el frontend -> enum Prisma
    const themeMap: Record<string, ThemeCategory> = {
      'Investigación Científica y Tecnológica':
        ThemeCategory.INVESTIGACION_CIENTIFICA_Y_TECNOLOGICA,
      'Innovación y Desarrollo (I+D)':
        ThemeCategory.INNOVACION_Y_DESARROLLO_ID,
      'Educación Científica y Tecnológica':
        ThemeCategory.EDUCACION_CIENTIFICA_Y_TECNOLOGICA,
      'Ciencia y Sociedad': ThemeCategory.CIENCIA_Y_SOCIEDAD,
      'Políticas Públicas en Ciencia y Tecnología':
        ThemeCategory.POLITICAS_PUBLICAS_EN_CIENCIA_Y_TECNOLOGIA,
      'Producción y Desarrollo Local':
        ThemeCategory.PRODUCCION_Y_DESARROLLO_LOCAL,
      'Juventud Investigadora': ThemeCategory.JUVENTUD_INVESTIGADORA,
      'Mujeres y Diversidades en la Ciencia':
        ThemeCategory.MUJERES_Y_DIVERSIDADES_EN_LA_CIENCIA,
      'Perspectiva Formoseña': ThemeCategory.PERSPECTIVA_FORMOSENA,
      'Recensiones y Reseña': ThemeCategory.RECENSIONES_Y_RESEÑA,
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
      throw new BadRequestException('La temática seleccionada no existe.');
    }

    //  CREACIÓN DE ARTÍCULO 
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

    //  CREACIÓN DE AUTORES 
    const authorsData = createArticleDto.authors.map((author) => ({
      articleId: article.id,
      name: author.name,
      surname: author.surname,
      email: author.email,
      affiliation: author.affiliation,
    }));
    await this.prisma.authorsOnArticles.createMany({
      data: authorsData,
    });

    //  CREACIÓN DE BIBLIOGRAFÍAS 
    const bibliographiesData = createArticleDto.bibliographies.map((ref) => ({
      articleId: article.id,
      reference: ref,
    }));
    await this.prisma.bibliography.createMany({
      data: bibliographiesData,
    });

    //  GUARDAR DOCUMENTO OBLIGATORIO 
    if (!files.document || files.document.length === 0) {
      throw new BadRequestException('El archivo .docx es obligatorio');
    }
    const documentFile = files.document[0];
    await this.prisma.articleVersion.create({
      data: {
        articleId: article.id,
        fileUrl: documentFile.path, // Guardamos la ruta del archivo
        isLatest: true,
      },
    });

    //  GUARDAR IMÁGENES (OPCIONALES) 
    if (files.images && files.images.length > 0) {
      const imagesData = files.images.map((img) => ({
        articleId: article.id,
        url: img.path, // Guardamos la ruta de cada imagen
      }));

      await this.prisma.articleImage.createMany({
        data: imagesData,
      });
    }

    return {
      message: 'Artículo creado con éxito',
      articleId: article.id,
    };
  }

  async findAll() {
    return this.prisma.article.findMany({
      include: {
        authors: true, // Incluye los autores asociados al artículo
        theme: true, // Incluye la temática del artículo
        bibliographies: true, // Incluye las bibliografías asociadas
        images: true, // Incluye las imágenes asociadas
        versions: true, // Incluye las versiones con el archivo docx
      },
    });
  }

  
  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        authors: true,
        theme: true,
        bibliographies: true,
        images: true,
        versions: true,
      },
    });

    if (!article) {
      throw new NotFoundException(`El artículo con ID ${id} no existe.`);
    }

    return article;
  }
}
