import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  Get,
  Param,
} from '@nestjs/common';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiExtraModels} from '@nestjs/swagger';
import { PaperDto } from './dto/scientist-paper.dto';
import { BitacoraDto } from './dto/student-binnacle.dto';

@ApiTags('Artículos')
@ApiExtraModels(PaperDto, BitacoraDto)
@Controller('articles') 
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({ summary: 'Crear un nuevo artículo' })
  @ApiResponse({ status: 201, description: 'Artículo creado exitosamente.' })
  @ApiResponse({ status: 400, description: 'Error en datos o archivos.' })
  // Interceptor para manejar la subida de archivos (imagenes y archivo .docx)
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'images', maxCount: 5 },
        { name: 'document', maxCount: 1 },
      ],
      {
        storage: diskStorage({
          // Se define donde se guardarán las imágenes y documentos (según el campo)
          destination: (req, file, callback) => {
          let uploadPath = 'public/';

            if (file.fieldname === 'images') {
              uploadPath += 'images';
            } else if (file.fieldname === 'document') {
              uploadPath += 'documents';
            }

            callback(null, uploadPath);
          },
          // Se crea un nombre único para evitar colisiones
          filename: (req, file, callback) => {
            const uniqueSuffix =
              Date.now() + '-' + Math.round(Math.random() * 1e9);
            callback(
              null,
              `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`,
            );
          },
        }),
        // Validación de tipos de archivos
        fileFilter: (req, file, callback) => {
          if (file.fieldname === 'images') {
            if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
              return callback(
                new Error('Solo se permiten imágenes JPG/PNG'),
                false,
              );
            }
          }
          if (file.fieldname === 'document') {
            if (extname(file.originalname).toLowerCase() !== '.docx' && extname(file.originalname).toLowerCase() !== '.doc' ) {
              return callback(
                new Error('Solo se permite un archivo .docx'),
                false,
              );
            }
          }
          callback(null, true);
        },
      },
    ),
  )
  async create(
    @Body() createArticleDto: CreateArticleDto,
    @UploadedFiles()
    files: {
      images?: Express.Multer.File[];
      document?: Express.Multer.File[];
    },
    @Req() req,
  ) {
    if (!files.document || files.document.length === 0) {
      throw new BadRequestException('El archivo .docx es obligatorio');
    }

    const userId = req.user.userId;
    return this.articlesService.create(createArticleDto, userId, files);
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todos los artículos' })
  @ApiResponse({ status: 200, description: 'Lista de artículos.' })
  async findAll() {
    return this.articlesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un artículo por ID' })
  @ApiResponse({ status: 200, description: 'Artículo encontrado.' })
  @ApiResponse({ status: 404, description: 'Artículo no encontrado.' })
  async findOne(@Param('id') id: string) {
    return this.articlesService.findOne(id);
  }
}
