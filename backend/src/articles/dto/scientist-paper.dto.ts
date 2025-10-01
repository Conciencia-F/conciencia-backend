import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaperDto {
  @ApiProperty({
    description:
      'Tema del paper científico. Debe ser uno de los valores permitidos en las temáticas oficiales.',
    example: 'Investigación Científica y Tecnológica',
    enum: [
      'Investigación Científica y Tecnológica',
      'Innovación y Desarrollo (I+D)',
      'Educación Científica y Tecnológica',
      'Ciencia y Sociedad',
      'Políticas Públicas en Ciencia y Tecnología',
      'Producción y Desarrollo Local',
      'Juventud Investigadora',
      'Mujeres y Diversidades en la Ciencia',
      'Perspectiva Formoseña',
      'Recensiones y Reseña',
    ],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(
    [
      'Investigación Científica y Tecnológica',
      'Innovación y Desarrollo (I+D)',
      'Educación Científica y Tecnológica',
      'Ciencia y Sociedad',
      'Políticas Públicas en Ciencia y Tecnología',
      'Producción y Desarrollo Local',
      'Juventud Investigadora',
      'Mujeres y Diversidades en la Ciencia',
      'Perspectiva Formoseña',
      'Recensiones y Reseña',
    ],
    {
      message:
        'Tema inválido. Debe ser uno de los valores permitidos en las temáticas oficiales',
    },
  )
  theme: string;
}
