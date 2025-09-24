import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class PaperDto {
    @IsString()
    @IsNotEmpty()
    @IsIn([
        'Investigación Científica y Tecnológica',
        'Innovación y Desarrollo (I+D)',
        'Educación Científica y Tecnológica',
        'Ciencia y Sociedad',
        'Políticas Públicas en Ciencia y Tecnología',
        'Producción y Desarrollo Local',
        'Juventud Investigadora',
        'Mujeres y Diversidades en la Ciencia',
        'Perspectiva Formoseña',
        'Recensiones y Reseña'
    ], {
        message:
            'Tema inválido. Debe ser uno de los valores permitidos en las temáticas oficiales',
    })
    theme: string;
}
