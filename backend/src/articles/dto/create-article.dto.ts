import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  ValidateNested,
  IsIn,
  IsNotEmpty,
  ArrayNotEmpty,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthorDto } from './author.dto';
import { BitacoraDto } from './student-binnacle.dto';
import { PaperDto } from './scientist-paper.dto';

export class CreateArticleDto {
  @ApiProperty({
    description: 'Título del artículo',
    example: 'Avances en Inteligencia Artificial Aplicada a la Educación',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'Resumen del artículo',
    example:
      'Este artículo explora cómo la IA puede mejorar los procesos educativos mediante algoritmos de personalización y análisis de datos.',
  })
  @IsString()
  @IsNotEmpty()
  abstract: string;

  @ApiProperty({
    type: [AuthorDto],
    description: 'Lista de autores',
    example: [
      {
        name: 'Juan',
        surname: 'Pérez',
        email: 'juan.perez@example.com',
        affiliation: 'Universidad Nacional de Formosa',
      },
      {
        name: 'María',
        surname: 'Gómez',
        email: 'maria.gomez@example.com',
        affiliation: 'Instituto de Tecnología Avanzada',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AuthorDto)
  authors: AuthorDto[];

  @ApiProperty({
    enum: ['Bitacora Del Estudiante', 'Paper Científico'],
    description: 'Tipo de artículo',
    example: 'Paper Científico',
  })
  @IsString()
  @IsIn(['Bitacora Del Estudiante', 'Paper Científico'])
  articleType: 'Bitacora Del Estudiante' | 'Paper Científico';

  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(PaperDto) },
      { $ref: getSchemaPath(BitacoraDto) },
    ],
    description: 'Temática del artículo',
    example: { theme: 'Investigación Científica y Tecnológica' },
  })
  @ValidateNested()
  @Type((obj) => {
    if (!obj || !obj.object) {
      throw new Error(
        'No se puede determinar el tipo de articleTheme: articleType es obligatorio',
      );
    }
    return obj.object.articleType === 'Paper Científico'
      ? PaperDto
      : BitacoraDto;
  })
  articleTheme: BitacoraDto | PaperDto;

  @ApiProperty({
    type: [String],
    description: 'Etiquetas del artículo',
    minItems: 1,
    example: ['IA', 'Educación', 'Algoritmos'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty()
  @ArrayMinSize(1)
  tags: string[];

  @ApiProperty({
    type: [String],
    description: 'Lista de referencias bibliográficas (URLs) (al menos una)',
    minItems: 1,
    example: [
      'https://www.example.com/articulo1',
      'https://www.example.com/articulo2',
      'https://www.example.com/articulo3',
    ],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayNotEmpty({ message: 'Debe proporcionar al menos una bibliografía' })
  @ArrayMinSize(1, { message: 'Debe proporcionar al menos una bibliografía' })
  bibliographies: string[];

  // ESTO CAMPOS NO SON VALIDACIONES REALES. SOLO SIRVEN PARA DOCUMENTACIÓN EN SWAGGER (document e images se validan en el controller)
  @ApiProperty({
    description: 'FILE: Archivo principal en formato .docx (obligatorio). Se va a guardar en /public/documents',
         example: [
      "archivos de las imagenes"
    ],
  })
  document: any;

  @ApiProperty({
    isArray: true,
    description: 'FILE: Imágenes asociadas al artículo (opcional, hasta 5 imagenes). Se van a guardar en /public/images',
     example: [
      "archivos de los documentos"
    ],
  })
  images: any[];
}
