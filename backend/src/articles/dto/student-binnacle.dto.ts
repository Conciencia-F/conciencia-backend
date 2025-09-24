import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class BitacoraDto {
    @IsString()
    @IsNotEmpty()
    @IsIn([
        'Desarrollo de Software',
        'Telecomunicaciones',
        'Mecatrónica',
        'Química Industrial'
    ], {
        message: 'Tema inválido. Debe ser uno de los valores permitidos: Desarrollo de Software, Telecomunicaciones, Mecatrónica, Química Industrial',
    })
    theme: string;
}
