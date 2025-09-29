import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BitacoraDto {
    @ApiProperty({
        description: 'Tema de la bitácora. Debe ser uno de los valores permitidos.',
        example: 'Desarrollo de Software',
        enum: [
            'Desarrollo de Software',
            'Telecomunicaciones',
            'Mecatrónica',
            'Química Industrial'
        ],
    })
    @IsString()
    @IsNotEmpty()
    @IsIn([
        'Desarrollo de Software',
        'Telecomunicaciones',
        'Mecatrónica',
        'Química Industrial'
    ], {
        message:
            'Tema inválido. Debe ser uno de los valores permitidos: Desarrollo de Software, Telecomunicaciones, Mecatrónica, Química Industrial',
    })
    theme: string;
}
